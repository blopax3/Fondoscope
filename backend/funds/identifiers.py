import re

ISIN_PATTERN = re.compile(r"[A-Z]{2}[A-Z0-9]{9}[0-9]")
YAHOO_SYMBOL_PATTERN = re.compile(r"[A-Z0-9][A-Z0-9.-]{0,31}")


def normalize_isin(value: object) -> str:
    value = value.strip().upper() if isinstance(value, str) else ""
    if not ISIN_PATTERN.fullmatch(value):
        return ""
    digits = "".join(str(int(char, 36)) for char in value)
    total = sum(
        (digit * 2 // 10 + digit * 2 % 10) if index % 2 else digit
        for index, digit in enumerate(map(int, reversed(digits)))
    )
    return value if total % 10 == 0 else ""


def normalize_yahoo_symbol(value: object) -> str:
    value = value.strip().upper() if isinstance(value, str) else ""
    return value if YAHOO_SYMBOL_PATTERN.fullmatch(value) else ""
