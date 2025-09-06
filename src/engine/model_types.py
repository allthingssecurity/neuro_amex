from __future__ import annotations

from typing import Any, Dict
from pydantic import BaseModel


class DecisionFacts(BaseModel):
    # Placeholder for stricter typing in future; currently unused in service path
    data: Dict[str, Any]


def flatten_facts(nested: Dict[str, Any]) -> Dict[str, Any]:
    """Map nested input to DSL variable names used in auth_v1 policy.

    Known mappings:
    - amount -> amount
    - account.available -> avail
    - account.credit_limit -> limit
    - risk.score -> risk
    - risk.velocity_1h -> vel1h
    - context.mcc -> mcc
    - context.is_card_present -> cnp (negated)

    Any pre-flattened fields are passed through.
    """
    out: Dict[str, Any] = {}

    # Pass through simple top-level if present
    for k in ["amount", "avail", "limit", "risk", "vel1h", "mcc", "cnp"]:
        if k in nested:
            out[k] = nested[k]

    # Map from nested structures when present
    account = nested.get("account", {}) or {}
    risk = nested.get("risk", {}) or {}
    ctx = nested.get("context", {}) or {}

    if "available" in account:
        out.setdefault("avail", account.get("available"))
    if "credit_limit" in account:
        out.setdefault("limit", account.get("credit_limit"))

    # risk can be provided either as a scalar or under risk.score
    if isinstance(risk, dict) and "score" in risk:
        out.setdefault("risk", risk.get("score"))
    elif "risk" in nested and not isinstance(nested.get("risk"), dict):
        out.setdefault("risk", nested.get("risk"))

    if isinstance(risk, dict) and "velocity_1h" in risk:
        out.setdefault("vel1h", risk.get("velocity_1h"))

    if "mcc" in ctx:
        out.setdefault("mcc", ctx.get("mcc"))

    # Card-not-present flag
    if "is_card_present" in ctx:
        try:
            out.setdefault("cnp", not bool(ctx.get("is_card_present")))
        except Exception:
            pass

    # Ensure required fields exist if possible
    return out

