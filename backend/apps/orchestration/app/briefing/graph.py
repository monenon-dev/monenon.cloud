"""LangGraph 멀티에이전트 브리핑 그래프."""

from __future__ import annotations

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from orchestration.app.briefing.nodes import (
    calendar_agent_node,
    docs_agent_node,
    router_node,
    slack_agent_node,
    synthesizer_node,
)
from orchestration.app.briefing.state import BriefingState


@lru_cache(maxsize=1)
def build_briefing_graph():
    """
    router → calendar → docs → slack → synthesizer
    (데모 AgentTraceGraph와 동일한 5-노드 멀티에이전트 흐름)
    """
    graph = StateGraph(BriefingState)
    graph.add_node("router", router_node)
    graph.add_node("calendar", calendar_agent_node)
    graph.add_node("docs", docs_agent_node)
    graph.add_node("slack", slack_agent_node)
    graph.add_node("synthesizer", synthesizer_node)

    graph.add_edge(START, "router")
    graph.add_edge("router", "calendar")
    graph.add_edge("calendar", "docs")
    graph.add_edge("docs", "slack")
    graph.add_edge("slack", "synthesizer")
    graph.add_edge("synthesizer", END)
    return graph.compile()
