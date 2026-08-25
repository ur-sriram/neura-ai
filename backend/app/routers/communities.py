import uuid
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    CommunityHubFilter, CommunityHubListResponse, CommunityHub,
    FeedbackSubmission, FeedbackItem, FeedbackListResponse,
)
from app.data.ner_data import COMMUNITY_HUBS, CITIES

router = APIRouter()

FEEDBACK_STORE: List[Dict[str, Any]] = []


def _analyze_sentiment(comment: str) -> str:
    pos_kw = ["good", "great", "excellent", "helpful", "amazing", "thanks", "thank", "appreciate", "love", "wonderful"]
    neg_kw = ["bad", "poor", "worst", "terrible", "broken", "pothole", "blocked", "broken", "danger", "terrible"]
    c = comment.lower()
    pos = sum(1 for k in pos_kw if k in c)
    neg = sum(1 for k in neg_kw if k in c)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def _summarize_comment(comment: str) -> str:
    sentences = [s.strip() for s in re.split(r"[.!?]", comment) if s.strip()]
    return sentences[0][:140] + ("..." if len(sentences[0]) > 140 else "")


@router.get("/hubs", response_model=CommunityHubListResponse, summary="Find community hubs / partners in NER")
def get_hubs(
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    partner_type: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
):
    f = CommunityHubFilter(state=state, city=city, partner_type=partner_type, service=service)
    items: List[CommunityHub] = []
    for h in COMMUNITY_HUBS:
        if f.state and h["state"] != f.state:
            continue
        if f.city and h["city"] != f.city:
            continue
        if f.partner_type and h["partner_type"] != f.partner_type:
            continue
        if f.service and not any(f.service in s.lower() for s in h["services"]):
            continue
        items.append(CommunityHub(**h))
    return CommunityHubListResponse(count=len(items), items=items)


@router.post("/feedback", response_model=FeedbackItem, summary="Submit feedback; auto-assign to correct agent + sentiment")
def submit_feedback(data: FeedbackSubmission):
    if data.city and data.city not in CITIES:
        raise HTTPException(status_code=400, detail=f"Unknown city '{data.city}'. Known: {sorted(CITIES.keys())[:10]}...")
    sent = _analyze_sentiment(data.comment)
    summary = _summarize_comment(data.comment)
    category_agent_map = {
        "road_condition": "logistics",
        "accessibility": "accessibility",
        "emergency_response": "emergency",
        "logistics_service": "logistics",
        "community": "community",
        "other": "supervisor",
    }
    assignee = category_agent_map.get(data.category, "supervisor")
    record = {
        **data.model_dump(),
        "feedback_id": f"FB-{uuid.uuid4().hex[:8].upper()}",
        "submitted_at": datetime.utcnow(),
        "sentiment": sent,
        "summary": summary,
        "status": "new",
        "assignee_agent": assignee,
    }
    if not record.get("state"):
        record["state"] = data.state or CITIES.get(data.city, {}).get("state")
    FEEDBACK_STORE.append(record)
    return FeedbackItem(**record)


@router.get("/feedback", response_model=FeedbackListResponse, summary="List submitted feedback")
def list_feedback(
    status: Optional[str] = Query(None, description="new | reviewed | actioned"),
    category: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None, description="positive | neutral | negative"),
):
    items = FEEDBACK_STORE[:]
    if status:
        items = [f for f in items if f.get("status") == status]
    if category:
        items = [f for f in items if f.get("category") == category]
    if city:
        items = [f for f in items if f.get("city") == city]
    if sentiment:
        items = [f for f in items if f.get("sentiment") == sentiment]
    parsed = [FeedbackItem(**f) for f in items]
    stats: Dict[str, Any] = {
        "total": len(FEEDBACK_STORE),
        "by_category": {},
        "by_sentiment": {"positive": 0, "neutral": 0, "negative": 0},
        "by_status": {"new": 0, "reviewed": 0, "actioned": 0},
        "avg_rating": 0.0,
    }
    ratings = []
    for f in FEEDBACK_STORE:
        stats["by_category"][f["category"]] = stats["by_category"].get(f["category"], 0) + 1
        sent = f.get("sentiment") or "neutral"
        if sent in stats["by_sentiment"]:
            stats["by_sentiment"][sent] += 1
        st = f.get("status") or "new"
        if st in stats["by_status"]:
            stats["by_status"][st] += 1
        if f.get("rating"):
            ratings.append(f["rating"])
    if ratings:
        stats["avg_rating"] = round(sum(ratings) / len(ratings), 2)
    return FeedbackListResponse(total=len(parsed), items=parsed, summary_stats=stats)
