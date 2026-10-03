from time import monotonic

DEFAULT_START_DATE = "2000-01-01"
DEFAULT_CURRENCY = "AUTO"
DEFAULT_FREQUENCY = "daily"
DEFAULT_UNIVERSES = ("FOEUR$$ALL", "FOESP$$ALL", "FOGBR$$ALL")
HISTORY_BUDGET_SECONDS = 40
SUPPORTED_CURRENCIES = frozenset("""
AUTO AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND
BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUC CUP CVE CZK DJF
DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL
HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD
KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK
MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON
RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL
THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF
XCD XCG XDR XOF XPF XSU YER ZAR ZMW ZWG ZWL
""".split())


def normalize_currency(value: object) -> str:
    raw = value.strip() if isinstance(value, str) else "AUTO"
    currency = "GBP" if raw == "GBp" or raw.upper() == "GBX" else raw.upper() or "AUTO"
    return currency if currency in SUPPORTED_CURRENCIES else ""


def request_timeout(deadline: float | None, maximum: float = 8) -> float:
    remaining = maximum if deadline is None else min(maximum, deadline - monotonic())
    if remaining <= 0:
        raise TimeoutError("History request deadline exceeded")
    return remaining

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://www.morningstar.es/",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}
