from __future__ import annotations

from typing import Dict, List, Optional, Literal, TypedDict
from z3 import Solver, sat


Decision = Literal["approve_no_otp", "approve_with_otp", "decline"]


class VerifyResult(TypedDict):
    satisfiable: bool
    chosen_action: Optional[Decision]
    model: Dict[str, float | int | bool]
    checked_invariants: List[str]
    unsat_core: List[str]


class Verifier:
    def __init__(self, compiled_policy):
        # compiled_policy: (facts, forced_action?) -> (Solver, meta)
        self.compiled = compiled_policy

    def check(self, facts: Dict, forced_action: Optional[str] = None) -> VerifyResult:
        s: Solver
        s, meta = self.compiled(facts, forced_action)
        result = s.check()
        if result == sat:
            m = s.model()
            return {
                "satisfiable": True,
                "chosen_action": meta["chosen_action"](m),
                "model": {k: meta["val_of"](m, k) for k in meta["vars"]},
                "checked_invariants": meta["invariants"],
                "unsat_core": [],
            }
        else:
            return {
                "satisfiable": False,
                "chosen_action": None,
                "model": {},
                "checked_invariants": meta["invariants"],
                "unsat_core": meta["unsat_core_names"](),
            }

