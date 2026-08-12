"""LangGraph 멀티에이전트 브리핑 그래프."""

from __future__ import annotations

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from orchestration.app.briefing.nodes import (
    calendar_tool_node,
    docs_tool_node,
    history_tool_node,
    router_node,
    synthesizer_node,
    validator_node,
)
from orchestration.app.briefing.state import BriefingState


def _after_validator(state: BriefingState) -> str:
    if state.get("validation_ok"):
        return "end"
    if int(state.get("synth_retries") or 0) >= 2:
        return "end"
    return "synthesizer"


@lru_cache(maxsize=1)
def build_briefing_graph():
    """
    router → calendar → docs → history → synthesizer → validator
    (validator 실패 시 synthesizer 최대 2회 재호출)
    """
    graph = StateGraph(BriefingState)
    graph.add_node("router", router_node)
    graph.add_node("calendar", calendar_tool_node)
    graph.add_node("docs", docs_tool_node)
    graph.add_node("history", history_tool_node)
    graph.add_node("synthesizer", synthesizer_node)
    graph.add_node("validator", validator_node)

    graph.add_edge(START, "router")
    graph.add_edge("router", "calendar")
    graph.add_edge("calendar", "docs")
    graph.add_edge("docs", "history")
    graph.add_edge("history", "synthesizer")
    graph.add_edge("synthesizer", "validator")
    graph.add_conditional_edges(
        "validator",
        _after_validator,
        {"synthesizer": "synthesizer", "end": END},
    )
    return graph.compile()
