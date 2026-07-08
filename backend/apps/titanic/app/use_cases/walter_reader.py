from __future__ import annotations

from pathlib import Path

import pandas as pd

_CSV_PATH = Path(__file__).resolve().parent.parent / "Titanic-Dataset.csv"


class WalterReader:
    """CSV 기반 타이타닉 학습·전처리."""

    def __init__(self) -> None:
        if _CSV_PATH.is_file():
            self._df = pd.read_csv(_CSV_PATH)
        else:
            self._df = pd.DataFrame()

    def get_data(self) -> pd.DataFrame:
        if self._df.empty:
            return pd.DataFrame()
        return self._df.astype(object).where(self._df.notna(), None)

    def get_count(self) -> int:
        return int(self._df.shape[0])

    def get_features_and_labels(self) -> tuple[pd.DataFrame, pd.Series]:
        if self._df.empty:
            return pd.DataFrame(), pd.Series(dtype=int)

        df = self._df.copy()
        sex_col = "gender" if "gender" in df.columns else "Sex"
        df["Sex"] = df[sex_col].fillna("").astype(str).str.lower().map({"male": 0, "female": 1}).fillna(0)
        df["Embarked"] = df["Embarked"].fillna("").astype(str).str.upper().map({"S": 0, "C": 1, "Q": 2}).fillna(0)
        for col in ("Age", "Fare", "Pclass", "SibSp", "Parch"):
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        df["Survived"] = pd.to_numeric(df["Survived"], errors="coerce").fillna(0).astype(int)

        features = df[["Pclass", "Sex", "Age", "SibSp", "Parch", "Fare", "Embarked"]]
        labels = df["Survived"]
        return features, labels

    def preprocess_single_passenger(self, passenger: dict) -> pd.DataFrame:
        sex_raw = passenger.get("gender") or passenger.get("Sex") or "male"
        sex = 1 if str(sex_raw).lower() == "female" else 0
        embarked_raw = passenger.get("Embarked") or passenger.get("embarked") or "S"
        embarked = {"S": 0, "C": 1, "Q": 2}.get(str(embarked_raw).upper(), 0)

        row = {
            "Pclass": int(passenger.get("Pclass") or passenger.get("pclass") or 3),
            "Sex": sex,
            "Age": float(passenger.get("Age") or passenger.get("age") or 0),
            "SibSp": int(passenger.get("SibSp") or passenger.get("sibsp") or 0),
            "Parch": int(passenger.get("Parch") or passenger.get("parch") or 0),
            "Fare": float(passenger.get("Fare") or passenger.get("fare") or 0),
            "Embarked": embarked,
        }
        return pd.DataFrame([row])
