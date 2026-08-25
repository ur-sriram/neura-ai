from typing import TypedDict, List, Dict, Optional, Any, Literal


AgentName = Literal["supervisor", "logistics", "accessibility", "emergency", "community"]


class NERGraphState(TypedDict, total=False):
    user_message: str
    user_id: Optional[str]
    agent_override: Optional[AgentName]
    history: List[Dict[str, str]]

    detected_intent: Optional[str]
    detected_agent: AgentName
    intent_confidence: float

    entities: Dict[str, Any]
    cities: List[str]
    states_mentioned: List[str]
    constraints: List[str]
    special_needs: List[str]

    logistics_result: Optional[Dict[str, Any]]
    accessibility_result: Optional[Dict[str, Any]]
    emergency_result: Optional[Dict[str, Any]]
    community_result: Optional[Dict[str, Any]]

    supervisor_notes: List[str]
    actions_taken: List[str]

    final_reply: str
    sources: List[str]
    suggested_followups: List[str]
