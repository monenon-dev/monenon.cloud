from __future__ import annotations

import re
from typing import Any

from kiwipiepy import Kiwi

from titanic.adapter.inbound.api.schemas.passenger_jack_trainer_schema import JackTrainerSchema
from titanic.app.dto.passenger_jack_trainer_dto import JackTrainerQuery, JackTrainerResponse
from titanic.app.ports.input.passenger_jack_trainer_use_case import JackTrainerUseCase
from titanic.app.ports.output.passenger_jack_trainer_repository import JackTrainerRepository

_KEYWORD_TAGS = ("NN", "VV", "VA", "MM")
_INTENT_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("survival_prediction", re.compile(r"(생존|예측|survival|predict)", re.IGNORECASE)),
    ("model_training", re.compile(r"(학습|훈련|train)", re.IGNORECASE)),
    ("model_info", re.compile(r"(모델|model|성능|정확도)", re.IGNORECASE)),
    ("passenger_data", re.compile(r"(승객|데이터|passenger)", re.IGNORECASE)),
]


class JackTrainerInteractor(JackTrainerUseCase):
    def __init__(self, repository: JackTrainerRepository):
        self.repository = repository
        self.kiwi = Kiwi()

    def _kiwi_analyze(self, user_text: str) -> dict[str, Any]:
        tokens = self.kiwi.tokenize(user_text)
        cleaned_text = self.kiwi.join(tokens)
        nouns = [token.form for token in tokens if token.tag.startswith("NN")]
        keywords = list(
            dict.fromkeys(
                token.form for token in tokens if token.tag.startswith(_KEYWORD_TAGS)
            )
        )
        return {"cleaned_text": cleaned_text, "nouns": nouns, "keywords": keywords}

    async def introduce_myself(self, schema: JackTrainerSchema) -> JackTrainerResponse:
        return await self.repository.introduce_myself(
            JackTrainerQuery(id=schema.id, name=schema.name)
        )

    async def preprocess_message(self, user_text: str) -> dict[str, Any]:
        analyzed = self._kiwi_analyze(user_text)
        return {"cleaned_text": analyzed["cleaned_text"], "nouns": analyzed["nouns"]}

    async def analyze_message_intent(self, user_message: str) -> dict[str, Any]:
        analyzed = self._kiwi_analyze(user_message)
        cleaned_text = analyzed["cleaned_text"]
        intent = "general"
        matched_terms: list[str] = []
        search_text = f"{user_message} {cleaned_text}"
        for intent_name, pattern in _INTENT_RULES:
            match = pattern.search(search_text)
            if match:
                intent = intent_name
                matched_terms.append(match.group(0))
                break
        return {
            "message": user_message,
            "cleaned_text": cleaned_text,
            "keywords": analyzed["keywords"],
            "intent": intent,
            "matched_terms": matched_terms,
        }

    async def get_model_info(self) -> dict[str, Any]:
        rows = await self.training_row_count()
        return {"training_rows": rows, "preprocessor": "kiwipiepy"}

    async def analyze_jack_dawson(self) -> dict[str, Any]:
        return {
            "subject": "Jack Dawson",
            "training_rows": await self.training_row_count(),
            "preprocessor": "kiwipiepy",
        }

    async def predict_survival(self, passenger_data: dict[str, Any]) -> dict[str, Any]:
        return {"input": passenger_data, "prediction": None}

    async def training_row_count(self) -> int:
        get_training_data = getattr(self.repository, "get_training_data", None)
        if get_training_data is None:
            return 0
        rows: list[dict[str, Any]] = await get_training_data()
        return len(rows)
