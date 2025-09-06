from __future__ import annotations

import os
import yaml
from typing import Any, Dict

from decisionspec.compiler import compile as compile_spec
from engine.verifier import Verifier
from engine import proposer, repair, explainer


# Compile default policy (auth_v1)
_POLICY_PATH = os.environ.get("POLICY_PATH", os.path.join(os.path.dirname(__file__), "..", "policies", "auth_v1.yaml"))
_POLICY_PATH = os.path.abspath(_POLICY_PATH)

with open(_POLICY_PATH, "r") as f:
    _spec = yaml.safe_load(f)

_compiled = compile_spec(_spec)
verifier = Verifier(_compiled)


def _pack(decision: str, proof: Dict[str, Any], explanation: str) -> Dict[str, Any]:
    return {
        "decision": decision,
        "policy_version": _spec.get("id", "unknown"),
        "proof": {
            "solver": "z3",
            "satisfiable": proof.get("satisfiable"),
            "model": proof.get("model"),
            "checked_invariants": proof.get("checked_invariants"),
            "unsat_core": proof.get("unsat_core", []),
        },
        "explanation": explanation,
    }


def decide(facts: Dict[str, Any], mode: str = "hard") -> Dict[str, Any]:
    if mode == "hard":
        res = verifier.check(facts)
        action = res["chosen_action"] or "decline"
        expl = explainer.template(action, facts, res)
        return _pack(action, res, expl)
    else:
        prop = proposer.propose(facts)
        res = verifier.check(facts, forced_action=prop["proposed_action"])
        if res["satisfiable"]:
            expl = explainer.template(prop["proposed_action"], facts, res, prop.get("justification"))
            return _pack(prop["proposed_action"], res, expl)
        # Repair once
        rep = repair.repair(prop, res["unsat_core"], facts)
        res2 = verifier.check(facts, forced_action=rep["proposed_action"])
        final_action = rep["proposed_action"] if res2["satisfiable"] else "decline"
        expl = explainer.template(final_action, facts, res2, rep.get("justification"))
        return _pack(final_action, res2, expl)

