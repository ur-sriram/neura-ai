import httpx
from typing import Dict, Any, Optional
from app.config import settings
from app.models.schema import DecisionRecord

def render_template_explanation(candidates_data: list, selection_summary: dict = None) -> str:
    """
    Template-based explanation - always available, 100% reliable, zero external dependencies.
    Renders exact audit prose format specified in Section 35.1 of master spec.
    """
    if not candidates_data:
        return "No assignments made. All candidate routes were infeasible due to bridge weight or road closures."

    lines = []
    lines.append("### Recommended Fleet Dispatch & Route Plan")
    lines.append("")

    for item in candidates_data:
        v_id = item.get('vehicle_id', 'Vehicle')
        d_ids = item.get('delivery_ids', [])
        chosen = item.get('chosen_route', {})
        routes = item.get('candidate_routes', [])

        route_name = chosen.get('route_label', 'Route A')
        dist_km = round(chosen.get('distance_m', 0.0) / 1000.0, 1)
        eta_p50 = chosen.get('eta_p50', 2.0)
        eta_p90 = chosen.get('eta_p90', 3.0)
        risk = chosen.get('p_closure', 0.0)

        lines.append(f"**Vehicle {v_id[:8]} → Deliveries {len(d_ids)}:**")
        lines.append(f"- **Selected {route_name}:** Distance {dist_km} km, ETA p50/p90: {eta_p50}h–{eta_p90}h, Closure Risk: {risk:.0%}.")

        rejected = [r for r in routes if not r.get('chosen')]
        for r in rejected:
            r_name = r.get('route_label', 'Route')
            reason = r.get('rejection_reason') or f"Cost delta +{r.get('cost_total',0)-chosen.get('cost_total',0):.1f}"
            lines.append(f"  - *Rejected {r_name}:* {reason}")

        lines.append("")

    if selection_summary:
        lines.append(f"*Summary: {selection_summary.get('assigned_vehicles', 0)} vehicles assigned, {selection_summary.get('deferred_deliveries', 0)} routine deliveries deferred for risk safety.*")

    return "\n".join(lines)

async def generate_llm_explanation(template_prose: str, prompt_context: str = "") -> Optional[str]:
    """
    Optional LLM prose enhancement via OpenAI-compatible API.
    If API key is missing or call fails, returns None (client uses template).
    """
    if not settings.LLM_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.LLM_API_KEY}"},
                json={
                    "model": settings.LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are NE-Setu's XAI Decision Explanation Assistant for logistics officers in North Eastern India. Summarize logistics decision records clearly and concisely."},
                        {"role": "user", "content": f"Enhance this structured decision record into a brief operational brief:\n\n{template_prose}"}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 250
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return data['choices'][0]['message']['content'].strip()
    except Exception as e:
        print(f"⚠️ LLM API call failed ({e}). Falling back to template explanation.")
    return None
