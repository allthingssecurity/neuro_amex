from __future__ import annotations

from typing import Dict, Any


def template(action: str, facts: Dict[str, Any], proof: Dict[str, Any], justification_from_llm: str | None = None) -> str:
    if proof.get("satisfiable"):
        if action == "approve_no_otp":
            return "Approved without OTP: low risk and within available balance."
        elif action == "approve_with_otp":
            return (
                justification_from_llm
                or f"Approved with OTP because risk={facts.get('risk')} ≤ 0.55, amount ≤ limit, velocity within cap."
            )
        else:
            return "Declined."
    else:
        examples = "; ".join([f"`{v}`" for v in (proof.get("unsat_core") or [])])
        return f"Declined: violated {examples}."

