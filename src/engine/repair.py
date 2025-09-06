from __future__ import annotations

from typing import Dict, Any, List


def repair(previous_proposal: Dict[str, Any], unsat_core: List[str], facts: Dict[str, Any], allowed_actions: List[str] | None = None) -> Dict[str, Any]:
    """Deterministic mock repair: if risk ceiling violated under CNP, decline; else try approve_with_otp or decline.

    Returns same schema as proposer: {proposed_action, justification, requested_additional_data}
    """
    allowed = set(allowed_actions or ["decline", "approve_with_otp", "approve_no_otp"])
    risk = facts.get("risk")
    limit = facts.get("limit")
    amount = facts.get("amount")

    # If CNP tightening violated or explicit reference to risk <= 0.55
    core_txt = " ".join(unsat_core or [])
    if "cnp_tightened" in core_txt or "risk <= 0.55" in core_txt:
        if "decline" in allowed:
            return {
                "proposed_action": "decline",
                "justification": "CNP with risk above policy threshold.",
                "requested_additional_data": [],
            }

    # Otherwise, if within overall limit but not within avail, try approve_with_otp
    try:
        if risk is not None and amount is not None and limit is not None and risk <= 0.55 and amount <= float(limit) and "approve_with_otp" in allowed:
            return {
                "proposed_action": "approve_with_otp",
                "justification": "Within limit; risk acceptable for step-up.",
                "requested_additional_data": [],
            }
    except Exception:
        pass

    # Fallback
    if "decline" in allowed:
        return {
            "proposed_action": "decline",
            "justification": "Constraints unsatisfied after repair.",
            "requested_additional_data": [],
        }
    # Last resort: return previous
    return {
        "proposed_action": previous_proposal.get("proposed_action", "decline"),
        "justification": "No allowed action fits repair.",
        "requested_additional_data": [],
    }

