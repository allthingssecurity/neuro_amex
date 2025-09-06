import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC_DIR = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from engine.router import decide
from engine.model_types import flatten_facts


def test_soft_path_repairs_or_accepts():
    facts = {
        "amount": 500.0,
        "account": {"available": 450.0, "credit_limit": 1000.0},
        "risk": {"score": 0.62, "velocity_1h": 2},
        "context": {"mcc": 5999, "is_card_present": False},
    }
    flat = flatten_facts(facts)
    res = decide(flat, mode="soft")
    assert res["decision"] in ("decline", "approve_with_otp")


def test_hard_path_decline_on_cnp_high_risk():
    facts = {
        "amount": 200.0,
        "account": {"available": 1000.0, "credit_limit": 5000.0},
        "risk": {"score": 0.7, "velocity_1h": 1},
        "context": {"mcc": 5999, "is_card_present": False},
    }
    flat = flatten_facts(facts)
    res = decide(flat, mode="hard")
    assert res["decision"] == "decline"
    assert "cnp_tightened" in ",".join(res["proof"].get("unsat_core", [])) or not res["proof"]["satisfiable"]

