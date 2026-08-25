import base64
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body

from app.models.schemas import (
    ChatRequest, ChatResponse, AgentTrace,
    ImageAnalysisRequest, ImageAnalysisResponse,
    PlanRequest, PlanResponse, PlanItem,
)
from app.services.gemini_service import chat_with_ai, analyze_image, plan_trip
from app.agents.graph import run_agent_query, graph_description

router = APIRouter()


@router.post("/chat", response_model=ChatResponse, summary="Chat with AI multi-agent (supervisor + 4 specialists)")
async def chat(req: ChatRequest):
    try:
        if req.agent == "auto" or req.agent is None:
            graph_result = run_agent_query(
                message=req.message,
                user_id=req.user_id,
                history=req.history,
            )
            reply = graph_result.get("final_reply") or "(no reply)"
            trace = AgentTrace(
                agent=graph_result.get("detected_agent", "supervisor"),
                intent_detected=graph_result.get("detected_intent", "general"),
                confidence=float(graph_result.get("intent_confidence", 0.0)),
                actions=[str(a) for a in graph_result.get("actions_taken", [])],
            )
            return ChatResponse(
                reply=reply,
                sources=graph_result.get("sources", []),
                agent_trace=trace,
                suggested_followups=graph_result.get("suggested_followups", []),
            )
        else:
            override = req.agent
            if override not in ("logistics", "accessibility", "emergency", "community"):
                raise HTTPException(status_code=400, detail="Invalid agent override")
            graph_result = run_agent_query(
                message=req.message,
                user_id=req.user_id,
                agent_override=override,
                history=req.history,
            )
            reply = graph_result.get("final_reply") or "(no reply)"
            trace = AgentTrace(
                agent=override,
                intent_detected=graph_result.get("detected_intent", override + ".forced"),
                confidence=float(graph_result.get("intent_confidence", 0.9)),
                actions=[str(a) for a in graph_result.get("actions_taken", [])],
            )
            return ChatResponse(
                reply=reply,
                sources=graph_result.get("sources", []),
                agent_trace=trace,
                suggested_followups=graph_result.get("suggested_followups", []),
            )
    except Exception as e:
        try:
            fb = await chat_with_ai(req.message, req.history, req.agent)
            return ChatResponse(
                reply=fb.get("reply", f"Error: {e}"),
                sources=fb.get("sources", []),
                agent_trace=fb.get("agent_trace"),
                suggested_followups=fb.get("followups", []),
            )
        except Exception as e2:
            raise HTTPException(status_code=500, detail=f"Chat failed: {e} / {e2}")


@router.post("/analyze-image", response_model=ImageAnalysisResponse, summary="Analyze road photo: surface, accessibility, disaster risk")
async def analyze_image_endpoint(
    image: Optional[UploadFile] = File(None, description="Upload road photo (jpg/png)"),
    image_b64: Optional[str] = Form(None, description="Alternatively: base64-encoded image"),
    context_location: Optional[str] = Form(None, description="Where was photo taken (city name in NER)"),
):
    b64 = image_b64
    if image:
        raw = await image.read()
        b64 = base64.b64encode(raw).decode("utf-8")
    if not b64:
        b64 = None
    try:
        result = await analyze_image(image_b64=b64, image_url=None, context_location=context_location)
        return ImageAnalysisResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {e}")


@router.post("/analyze-image-json", response_model=ImageAnalysisResponse, summary="Image analysis (JSON body: image_b64 or image_url)")
async def analyze_image_json(req: ImageAnalysisRequest):
    if not req.image_b64 and not req.image_url:
        raise HTTPException(status_code=400, detail="Provide image_b64 or image_url")
    try:
        result = await analyze_image(image_b64=req.image_b64, image_url=req.image_url, context_location=req.context_location)
        return ImageAnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {e}")


@router.post("/plan", response_model=PlanResponse, summary="AI weather-aware trip/shipment/evacuation plan")
def plan(req: PlanRequest):
    try:
        data = plan_trip(
            trip_type=req.trip_type, source=req.source, destination=req.destination,
            start_date=req.start_date, constraints=req.constraints, vehicle_type=req.vehicle_type,
        )
        itinerary = [PlanItem(**i) for i in data["itinerary"]]
        return PlanResponse(
            title=data["title"],
            overall_risk=data["overall_risk"],
            overview=data["overview"],
            itinerary=itinerary,
            packing_list=data["packing_list"],
            contacts=data["contacts"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {e}")


@router.get("/graph", summary="LangGraph agent flow description + Mermaid diagram")
def get_agent_graph_info() -> Dict[str, Any]:
    return graph_description()
