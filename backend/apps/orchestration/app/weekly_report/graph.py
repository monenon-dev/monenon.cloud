"""LangGraph 주간 업무 리포트 서브플로우."""

from __future__ import annotations

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from orchestration.app.weekly_report.nodes import (
    aggregate_briefings_node,
    next_action_recommender_node,
    report_synthesizer_node,
    risk_analyzer_node,
    validator_node,
    weekly_router_node,
)
from orchestration.app.weekly_report.state import WeeklyReportState


def _after_validator(state: WeeklyReportState) -> str:
    if state.get("validation_ok"):
        return "end"
    if int(state.get("synth_retries") or 0) >= 1:
        return "end"
    return "report_synthesizer"


@lru_cache(maxsize=1)
def build_weekly_report_graph():
    """
    weekly_router → aggregate_briefings → risk_analyzer →
    next_action_recommender → report_synthesizer → validator
    (validator 실패 시 report_synthesizer 최대 1회 재호출)
    """
    graph = StateGraph(WeeklyReportState)
    graph.add_node("weekly_router", weekly_router_node)
    graph.add_node("aggregate_briefings", aggregate_briefings_node)
    graph.add_node("risk_analyzer", risk_analyzer_node)
    graph.add_node("next_action_recommender", next_action_recommender_node)
    graph.add_node("report_synthesizer", report_synthesizer_node)
    graph.add_node("validator", validator_node)

    graph.add_edge(START, "weekly_router")
    graph.add_edge("weekly_router", "aggregate_briefings")
    graph.add_edge("aggregate_briefings", "risk_analyzer")
    graph.add_edge("risk_analyzer", "next_action_recommender")
    graph.add_edge("next_action_recommender", "report_synthesizer")
    graph.add_edge("report_synthesizer", "validator")
    graph.add_conditional_edges(
        "validator",
        _after_validator,
        {"report_synthesizer": "report_synthesizer", "end": END},
    )
    return graph.compile()
