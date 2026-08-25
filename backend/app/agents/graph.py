from typing import Dict, Any, Optional, List

try:
    from langgraph.graph import StateGraph, END, START
    LANGGRAPH_AVAILABLE = True
except Exception:
    LANGGRAPH_AVAILABLE = False
    START = "__start__"
    END = "__end__"

    class StateGraph:
        def __init__(self, state_type):
            self.nodes = {}
            self.edges = []
            self.conditionals = []
            self.state_type = state_type
            self.compiled = False

        def add_node(self, name: str, fn):
            self.nodes[name] = fn

        def add_edge(self, src: str, dst: str):
            self.edges.append((src, dst))

        def add_conditional_edges(self, src, fn, mapping: Optional[Dict] = None):
            self.conditionals.append((src, fn, mapping))

        def compile(self):
            self.compiled = True
            return self

        def invoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
            return _run_fallback_graph(self, state)


from app.agents.state import NERGraphState, AgentName
from app.agents.nodes import (
    supervisor_node, router_after_supervisor,
    logistics_agent_node, accessibility_agent_node,
    emergency_agent_node, community_agent_node,
    aggregate_node,
)


def _run_fallback_graph(graph: "StateGraph", init_state: Dict[str, Any]) -> Dict[str, Any]:
    state: Dict[str, Any] = {**init_state}
    for key, val in NERGraphState.__annotations__.items():
        state.setdefault(key, None)

    sup_out = supervisor_node(state) or {}
    state.update(sup_out)

    next_agent = router_after_supervisor(state)
    specialist_out = None
    if next_agent == "logistics":
        specialist_out = logistics_agent_node(state) or {}
    elif next_agent == "accessibility":
        specialist_out = accessibility_agent_node(state) or {}
    elif next_agent == "emergency":
        specialist_out = emergency_agent_node(state) or {}
    elif next_agent == "community":
        specialist_out = community_agent_node(state) or {}
    else:
        specialist_out = logistics_agent_node(state) or {}
    state.update(specialist_out)

    agg_out = aggregate_node(state) or {}
    state.update(agg_out)
    return state


def build_agent_graph():
    builder = StateGraph(NERGraphState)
    builder.add_node("supervisor", supervisor_node)
    builder.add_node("logistics", logistics_agent_node)
    builder.add_node("accessibility", accessibility_agent_node)
    builder.add_node("emergency", emergency_agent_node)
    builder.add_node("community", community_agent_node)
    builder.add_node("aggregate", aggregate_node)

    builder.add_edge(START, "supervisor")
    builder.add_conditional_edges(
        "supervisor",
        router_after_supervisor,
        {
            "logistics": "logistics",
            "accessibility": "accessibility",
            "emergency": "emergency",
            "community": "community",
            "supervisor": "logistics",
        },
    )
    builder.add_edge("logistics", "aggregate")
    builder.add_edge("accessibility", "aggregate")
    builder.add_edge("emergency", "aggregate")
    builder.add_edge("community", "aggregate")
    builder.add_edge("aggregate", END)
    return builder.compile()


agent_graph = build_agent_graph()


def run_agent_query(
    message: str,
    user_id: Optional[str] = None,
    agent_override: Optional[AgentName] = None,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    initial: NERGraphState = {
        "user_message": message,
        "user_id": user_id,
        "agent_override": agent_override,
        "history": history or [],
    }
    try:
        result = agent_graph.invoke(initial)
    except Exception as e:
        result = _run_fallback_graph(agent_graph, initial)
        result.setdefault("actions_taken", []).append(f"fallback: langgraph error {e}; ran pure-Python orchestration")
    return result


def graph_mermaid_mermaid() -> str:
    return (
        "flowchart TD\n"
        "    START([START]) --> SUPERVISOR[SupervisorAgent\\n(intent classification)]\n"
        "    SUPERVISOR -->|logistics.route| LOG[LogisticsAgent\\n(A* route + ETA/cost)]\n"
        "    SUPERVISOR -->|accessibility.*| ACC[AccessibilityAgent\\n(score + route)]\n"
        "    SUPERVISOR -->|emergency.*| EMR[EmergencyAgent\\n(alerts + evacuation)]\n"
        "    SUPERVISOR -->|community.*| COM[CommunityAgent\\n(hubs + feedback)]\n"
        "    LOG --> AGG[aggregate\\nfinalize reply]\n"
        "    ACC --> AGG\n"
        "    EMR --> AGG\n"
        "    COM --> AGG\n"
        "    AGG --> END([END])\n"
    )


def graph_description() -> Dict[str, Any]:
    return {
        "langgraph_available": LANGGRAPH_AVAILABLE,
        "agents": ["supervisor", "logistics", "accessibility", "emergency", "community"],
        "flow": "START -> Supervisor -> conditional dispatch to one specialist -> aggregate -> END",
        "specialists": {
            "supervisor": "Intent classification via keyword scoring; routes to specialist; extracts cities, states, constraints.",
            "logistics": "Runs A* over NER road network weighted by terrain + weather; outputs ETA/cost/advisories.",
            "accessibility": "Computes 6-dim accessibility score per city; computes mobility-constrained route with pitstops.",
            "emergency": "Fetches active alerts; computes primary+backup evacuation routes with shelter lists + checklists.",
            "community": "Matches partner hubs; prepares feedback-submission guidance.",
        },
        "mermaid_md": graph_mermaid_mermaid(),
    }
