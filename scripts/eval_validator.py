#!/usr/bin/env python3
"""브리핑 validator 정확도 평가.

프로덕션 ``validator_node`` 를 mock 없이 직접 호출한다.

사용:
  cd backend && .venv/bin/python ../scripts/eval_validator.py
  # 또는
  PYTHONPATH=apps .venv/bin/python ../scripts/eval_validator.py
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
APPS = BACKEND / "apps"
for path in (str(APPS), str(BACKEND)):
    if path not in sys.path:
        sys.path.insert(0, path)

from orchestration.app.briefing.nodes import validator_node  # noqa: E402
from orchestration.tests.eval.validator_cases import CASES, ValidatorEvalCase  # noqa: E402

SEOUL = ZoneInfo("Asia/Seoul")
DEFAULT_REPORT = ROOT / "docs" / "validator_eval_results.md"


def _verdict_from_result(result: dict[str, Any]) -> str:
    """auto 모드·retries=0 기준: validation_ok False → fail, True → pass.

    문서 환각을 감지해 본문에서 제거(tool stream만 남김)한 경우도 fail로 친다.
    """
    for ev in result.get("tool_logs") or []:
        if not isinstance(ev, dict):
            continue
        params = ev.get("params")
        if isinstance(params, dict) and params.get("stripped_docs_hallucination") == 1:
            return "fail"
    notes = (result.get("validation_notes") or "").strip()
    if "문서 인용 근거 없음" in notes:
        return "fail"
    if result.get("validation_ok") is True and not result.get("validation_review_pending"):
        # forced 승인(재시도 한도)은 eval에서 retries=0이라 거의 안 오지만, 표시용
        if notes and any(
            ev.get("params", {}).get("forced") == 1
            for ev in (result.get("tool_logs") or [])
            if isinstance(ev, dict)
        ):
            return "fail"
        return "pass"
    if result.get("validation_review_pending"):
        return "fail"
    return "pass" if result.get("validation_ok") else "fail"


def _ratio_from_result(result: dict[str, Any]) -> float | None:
    for ev in reversed(result.get("tool_logs") or []):
        if not isinstance(ev, dict):
            continue
        params = ev.get("params")
        if isinstance(params, dict) and "ratio" in params:
            try:
                return float(params["ratio"])
            except (TypeError, ValueError):
                return None
    return None


def _build_state(case: ValidatorEvalCase) -> dict[str, Any]:
    ctx = case["input_context"]
    return {
        "query": "오늘의 업무 브리핑을 작성해 줘",
        "answer": case["generated_sentence"],
        "synth_pass": 1,
        "synth_retries": 0,
        "validator_mode": "auto",
        "tool_logs": [],
        "trace": [],
        "calendar_result": ctx.get("calendar_result") or {},
        "docs_result": ctx.get("docs_result") or {},
        "history_result": ctx.get("history_result") or {},
        "slack_summary": ctx.get("slack_summary") or {},
        "gmail_summary": ctx.get("gmail_summary") or {},
    }


async def _run_case(case: ValidatorEvalCase) -> dict[str, Any]:
    state = _build_state(case)
    result = await validator_node(state)  # type: ignore[arg-type]
    actual = _verdict_from_result(result)
    expected = case["expected_verdict"]
    return {
        "id": case["id"],
        "category": case["category"],
        "description": case["description"],
        "expected": expected,
        "actual": actual,
        "correct": actual == expected,
        "ratio": _ratio_from_result(result),
        "notes": (result.get("validation_notes") or "").strip(),
        "validation_ok": bool(result.get("validation_ok")),
        "sentence_preview": case["generated_sentence"].replace("\n", " ")[:120],
    }


def _metrics(rows: list[dict[str, Any]]) -> dict[str, float]:
    n = len(rows)
    correct = sum(1 for r in rows if r["correct"])
    # FP: expected pass but actual fail (정상 문장을 잘못 거름)
    # FN: expected fail but actual pass (지어낸 문장을 못 거름)
    pos = [r for r in rows if r["expected"] == "pass"]
    neg = [r for r in rows if r["expected"] == "fail"]
    fp = sum(1 for r in pos if r["actual"] == "fail")
    fn = sum(1 for r in neg if r["actual"] == "pass")
    return {
        "n": float(n),
        "accuracy": correct / n if n else 0.0,
        "false_positive_rate": fp / len(pos) if pos else 0.0,
        "false_negative_rate": fn / len(neg) if neg else 0.0,
        "tp": float(sum(1 for r in pos if r["actual"] == "pass")),
        "tn": float(sum(1 for r in neg if r["actual"] == "fail")),
        "fp": float(fp),
        "fn": float(fn),
        "n_pass_expected": float(len(pos)),
        "n_fail_expected": float(len(neg)),
    }


def _print_table(rows: list[dict[str, Any]], metrics: dict[str, float]) -> None:
    print()
    print("=" * 88)
    print("Moneo briefing validator evaluation")
    print("=" * 88)
    header = f"{'ID':<4} {'Cat':<13} {'Exp':<5} {'Act':<5} {'OK':<3} {'Ratio':<7} Description"
    print(header)
    print("-" * 88)
    for r in rows:
        ratio = f"{r['ratio']:.3f}" if isinstance(r["ratio"], float) else "-"
        mark = "Y" if r["correct"] else "N"
        print(
            f"{r['id']:<4} {r['category']:<13} {r['expected']:<5} {r['actual']:<5} "
            f"{mark:<3} {ratio:<7} {r['description'][:48]}"
        )
    print("-" * 88)
    print(
        f"Accuracy: {metrics['accuracy']:.1%}  "
        f"({int(metrics['tp'] + metrics['tn'])}/{int(metrics['n'])})"
    )
    print(
        f"False positive rate (정상→거름): {metrics['false_positive_rate']:.1%}  "
        f"({int(metrics['fp'])}/{int(metrics['n_pass_expected'])})"
    )
    print(
        f"False negative rate (환각→통과): {metrics['false_negative_rate']:.1%}  "
        f"({int(metrics['fn'])}/{int(metrics['n_fail_expected'])})"
    )
    print()
    mismatches = [r for r in rows if not r["correct"]]
    if mismatches:
        print("Mismatches:")
        for r in mismatches:
            print(f"  - {r['id']}: expected={r['expected']} actual={r['actual']}")
            if r["notes"]:
                print(f"    notes: {r['notes'][:160]}")
    else:
        print("All cases matched expected verdict.")
    print()


def _write_report(rows: list[dict[str, Any]], metrics: dict[str, float], path: Path) -> None:
    now = datetime.now(SEOUL).strftime("%Y-%m-%d %H:%M:%S %Z")
    lines: list[str] = [
        "# Briefing Validator 평가 결과",
        "",
        f"- 실행 시각: `{now}`",
        f"- 케이스 수: **{int(metrics['n'])}**",
        f"- Accuracy: **{metrics['accuracy']:.1%}** "
        f"({int(metrics['tp'] + metrics['tn'])}/{int(metrics['n'])})",
        f"- False positive rate (정상 문장을 잘못 거름): "
        f"**{metrics['false_positive_rate']:.1%}** "
        f"({int(metrics['fp'])}/{int(metrics['n_pass_expected'])})",
        f"- False negative rate (지어낸 문장을 못 거름): "
        f"**{metrics['false_negative_rate']:.1%}** "
        f"({int(metrics['fn'])}/{int(metrics['n_fail_expected'])})",
        "",
        "## Confusion",
        "",
        "| | Predicted pass | Predicted fail |",
        "|---|---:|---:|",
        f"| Expected pass | {int(metrics['tp'])} | {int(metrics['fp'])} |",
        f"| Expected fail | {int(metrics['fn'])} | {int(metrics['tn'])} |",
        "",
        "## 케이스 상세",
        "",
        "| ID | Category | Expected | Actual | Match | Ratio | Description |",
        "|----|----------|----------|--------|-------|-------|-------------|",
    ]
    for r in rows:
        ratio = f"{r['ratio']:.3f}" if isinstance(r["ratio"], float) else "—"
        match = "✓" if r["correct"] else "✗"
        desc = r["description"].replace("|", "/")
        lines.append(
            f"| {r['id']} | {r['category']} | {r['expected']} | {r['actual']} | "
            f"{match} | {ratio} | {desc} |"
        )

    lines.extend(["", "## 오판 / 메모", ""])
    mismatches = [r for r in rows if not r["correct"]]
    if not mismatches:
        lines.append("오판 없음.")
    else:
        for r in mismatches:
            lines.append(f"### {r['id']} ({r['category']})")
            lines.append(f"- expected `{r['expected']}`, actual `{r['actual']}`")
            if r["notes"]:
                lines.append(f"- validator notes: {r['notes']}")
            lines.append(f"- preview: `{r['sentence_preview']}`")
            lines.append("")

    lines.extend(
        [
            "## 평가 방법",
            "",
            "- 대상: `orchestration.app.briefing.nodes.validator_node` (프로덕션 코드 직접 호출)",
            "- 모드: `validator_mode=auto`, `synth_retries=0` (강제 승인·리뷰 우회 없음)",
            "- pass = `validation_ok=True` 이고 review pending 아님",
            "- fail = `validation_ok=False` (또는 review pending)",
            "- 케이스 정의: `backend/apps/orchestration/tests/eval/validator_cases.py`",
            "",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


async def main_async(report_path: Path, *, strict: bool) -> int:
    rows = [await _run_case(case) for case in CASES]
    metrics = _metrics(rows)
    _print_table(rows, metrics)
    _write_report(rows, metrics, report_path)
    print(f"Report written: {report_path}")
    if strict and metrics["accuracy"] < 1.0:
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate briefing validator_node")
    parser.add_argument(
        "--report",
        type=Path,
        default=DEFAULT_REPORT,
        help=f"Markdown report path (default: {DEFAULT_REPORT})",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 if accuracy < 1.0",
    )
    args = parser.parse_args()
    return asyncio.run(main_async(args.report.resolve(), strict=args.strict))


if __name__ == "__main__":
    raise SystemExit(main())
