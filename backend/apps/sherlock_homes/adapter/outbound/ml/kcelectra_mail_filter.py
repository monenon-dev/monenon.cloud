"""beomi/KcELECTRA-base 기반 메일 정상/스팸 분류 (CPU)."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)

KCELECTRA_BASE = "beomi/KcELECTRA-base"
DEFAULT_CLASSIFIER = "kdt-2-team4-newbiz/kcelectra-smishing-classifier"
THRESHOLD = float(os.getenv("KCELECTRA_MAIL_THRESHOLD", "0.5"))
MAX_LENGTH = 512

_instance: KcElectraMailFilter | None = None


@dataclass(frozen=True)
class MailFilterVerdict:
    is_normal: bool
    label: str
    score: float


class KcElectraMailFilter:
    """KcELECTRA-base 토크나이저 + 파인튜닝 분류 헤드로 정상 메일 여부 판별."""

    def __init__(self) -> None:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        classifier = os.getenv("KCELECTRA_MAIL_CLASSIFIER", DEFAULT_CLASSIFIER)
        logger.info("[KcElectraMailFilter] loading tokenizer=%s classifier=%s", KCELECTRA_BASE, classifier)
        self.tokenizer = AutoTokenizer.from_pretrained(KCELECTRA_BASE)
        self.model = AutoModelForSequenceClassification.from_pretrained(classifier)
        self.model.eval()

    def classify(self, text: str) -> MailFilterVerdict:
        import torch

        if not text.strip():
            return MailFilterVerdict(is_normal=True, label="normal", score=1.0)

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=MAX_LENGTH,
        )
        with torch.no_grad():
            logits = self.model(**inputs).logits
            probs = torch.softmax(logits, dim=-1).squeeze()

        pred_id = int(probs.argmax())
        score = float(probs[pred_id])
        label = self.model.config.id2label.get(pred_id, f"LABEL_{pred_id}")
        label_lower = label.lower()

        if "normal" in label_lower:
            is_normal = score >= THRESHOLD
        elif any(token in label_lower for token in ("phishing", "spam", "smish")):
            is_normal = False
        else:
            is_normal = pred_id == 0

        return MailFilterVerdict(is_normal=is_normal, label=label, score=score)


def get_kcelectra_mail_filter() -> KcElectraMailFilter:
    global _instance
    if _instance is None:
        _instance = KcElectraMailFilter()
    return _instance
