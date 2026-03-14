from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pandas as pd


@dataclass(slots=True)
class FundSnapshot:
    isin: str
    name: str
    history: pd.DataFrame
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class SearchCandidate:
    name: str
    raw: dict[str, Any]

    @property
    def candidate_ids(self) -> list[tuple[str, str]]:
        values: list[tuple[str, str]] = []

        for key in ("i", "pi"):
            value = self.raw.get(key)
            if isinstance(value, str) and value.strip():
                values.append((key, value.strip()))

        seen: set[str] = set()
        unique: list[tuple[str, str]] = []
        for label, value in values:
            if value not in seen:
                seen.add(value)
                unique.append((label, value))

        return unique
