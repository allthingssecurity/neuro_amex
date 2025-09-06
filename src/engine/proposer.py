from __future__ import annotations

from typing import Dict, Any


def propose(facts: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic mock proposer that returns strict JSON.

    Policy intuition (auth_v1):
      - approve_no_otp if risk <= 0.35 and amount <= avail
      - approve_with_otp if risk <= 0.55 and amount <= limit
      - else decline
    """
    # Facts may be nested; accept flattened inputs here
    risk = facts.get("risk") or facts.get("risk.score")
    amount = facts.get("amount")
    avail = facts.get("avail") or facts.get("account.available")
    limit = facts.get("limit") or facts.get("account.credit_limit")

    proposed_action = "decline"
    justification = "High risk or exceeds limits."

    try:
        if risk is not None and amount is not None and avail is not None and risk <= 0.35 and amount <= float(avail):
            proposed_action = "approve_no_otp"
            justification = "Low risk and within available balance."
        elif risk is not None and amount is not None and limit is not None and risk <= 0.55 and amount <= float(limit):
            proposed_action = "approve_with_otp"
            justification = "Borderline risk; within limit; step-up auth."
    except Exception:
        # Keep default decline on parsing issues
        pass

    return {
        "proposed_action": proposed_action,
        "justification": justification,
        "requested_additional_data": [],
    }

