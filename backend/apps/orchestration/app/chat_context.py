"""채팅 시 사용자 DB 맥락 주입 — 추후 냉장고·옷장 등 연동."""

from sqlalchemy.ext.asyncio import AsyncSession


async def augment_prompt_with_user_context(
    session: AsyncSession,
    user_id: int,
    prompt: str,
) -> str:
    _ = session, user_id
    return prompt
