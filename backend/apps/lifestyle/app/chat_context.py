"""채팅 프롬프트에 사용자 라이프스타일 컨텍스트 주입."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from lifestyle.adapter.outbound.orm.lifestyle_orm import RefrigeratorItem
from lifestyle.adapter.outbound.pg.lifestyle_pg_repository import LifestylePgRepository


async def augment_prompt_with_user_context(
    session: AsyncSession,
    user_id: int,
    prompt: str,
) -> str:
    """냉장고 재고·식재료 선호를 프롬프트 앞에 붙인다."""
    repo = LifestylePgRepository(session)
    try:
        await repo.verify_user(user_id)
    except Exception:
        return prompt

    fridge = await repo.get_or_create_refrigerator(user_id)
    result = await session.execute(
        select(RefrigeratorItem)
        .where(RefrigeratorItem.user_id == user_id)
        .order_by(RefrigeratorItem.id.desc())
    )
    items = list(result.scalars().all())
    avoided = [str(x) for x in (fridge.avoided_ingredients or []) if str(x).strip()]
    cooking = [str(x) for x in (fridge.cooking_preference_tags or []) if str(x).strip()]

    if not items and not avoided and not cooking:
        return prompt

    lines = ["[사용자 컨텍스트]"]
    if items:
        lines.append("현재 냉장고 재고:")
        for item in items:
            qty = (item.quantity or "").strip() or "수량 미정"
            lines.append(f"- {item.name} ({qty})")
    if avoided:
        lines.append(f"기피·알레르기 재료: {', '.join(avoided)}")
    if cooking:
        lines.append(f"선호 요리·식단: {', '.join(cooking)}")
    lines.append(
        "위 냉장고·식재료 정보는 음식·요리·레시피·장보기 질문에만 참고하세요."
    )
    lines.append(
        "날씨·옷차림·음악·일상 대화 등 다른 주제 질문에는 이 정보를 무시하고, "
        "사용자 질문에 맞게 정상적으로 답변하세요."
    )
    lines.append(
        "음식 관련 질문일 때만: 재료 목록은 이미 제공되었으므로 다시 묻지 말고, "
        "위 재고를 활용해 구체적인 요리·레시피를 추천하세요."
    )
    return "\n".join(lines) + "\n\n" + prompt
