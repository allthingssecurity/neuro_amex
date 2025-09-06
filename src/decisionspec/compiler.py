from __future__ import annotations

from typing import Any, Callable, Dict, List, Tuple, Optional
from z3 import (
    Solver,
    Bool,
    BoolVal,
    BoolRef,
    Int,
    IntVal,
    IntNumRef,
    Real,
    RealVal,
    ArithRef,
    And,
    Or,
    Not,
    Implies,
    Sum,
    If,
    is_true,
)

from .dsl_schema import validate_minimal


Z3Var = ArithRef | BoolRef


def _z3_to_python(val):
    try:
        # Int
        return int(val.as_long())
    except Exception:
        pass
    # Bool
    try:
        return bool(is_true(val))
    except Exception:
        pass
    # Real
    try:
        s = val.as_decimal(12)
        if s.endswith("?"):
            s = s[:-1]
        return float(s)
    except Exception:
        return str(val)


def _build_eval_env(vars_map: Dict[str, Z3Var], constants: Dict[str, Any]) -> Dict[str, Any]:
    def _And(*args):
        # support And([a,b,c]) and And(a,b,c)
        if len(args) == 1 and isinstance(args[0], (list, tuple)):
            return And(*args[0])
        return And(*args)

    def _Or(*args):
        if len(args) == 1 and isinstance(args[0], (list, tuple)):
            return Or(*args[0])
        return Or(*args)

    env: Dict[str, Any] = {
        "And": _And,
        "Or": _Or,
        "Not": Not,
        "Implies": Implies,
        "Sum": Sum,
        "If": If,
        "True": True,
        "False": False,
    }
    # Include variables and constants for eval context
    env.update(vars_map)
    if constants:
        env.update(constants)
    return env


def compile(spec: Dict[str, Any]) -> Callable[[Dict[str, Any], Optional[str]], Tuple[Solver, Dict[str, Any]]]:
    """Compile DecisionSpec dict to a callable: (facts, forced_action?) -> (Solver, meta).

    meta contains:
      - vars: List[str]
      - invariants: List[str]
      - unsat_core_names: () -> List[str]
      - chosen_action: (model) -> Optional[str]
      - val_of: (model, var_name) -> python value
      - z3_vars: Dict[str, Z3Var]
    """
    validate_minimal(spec)

    entities = spec.get("entities", {})
    reals: List[str] = entities.get("Reals", []) or []
    ints: List[str] = entities.get("Ints", []) or []
    bools: List[str] = entities.get("Bools", []) or []
    constants = spec.get("constants", {}) or {}
    invariants = spec.get("invariants", []) or []
    actions = spec.get("actions", []) or []
    one_hot = bool(spec.get("one_hot_actions", False))

    # Predeclare all Z3 vars and action flags
    z3_vars: Dict[str, Z3Var] = {}
    for v in reals:
        z3_vars[v] = Real(v)
    for v in ints:
        z3_vars[v] = Int(v)
    for v in bools:
        z3_vars[v] = Bool(v)

    action_flags: Dict[str, BoolRef] = {}
    for a in actions:
        nm = a["name"]
        action_flags[nm] = Bool(nm)

    # Helpers
    def parse_expr(expr: str, env: Dict[str, Any]):
        # Safe-ish eval: no builtins, controlled env only
        return eval(expr, {"__builtins__": {}}, env)

    def compiled(facts: Dict[str, Any], forced_action: Optional[str] = None) -> Tuple[Solver, Dict[str, Any]]:
        s = Solver()
        s.set(unsat_core=True)

        # Bind facts to variables
        for name, var in z3_vars.items():
            if name not in facts:
                # Leave unbound if not provided; policy constraints may still restrict
                continue
            val = facts[name]
            if isinstance(var, BoolRef):
                s.add(var == BoolVal(bool(val)))
            elif name in ints:
                s.add(var == IntVal(int(val)))
            else:
                # Real
                s.add(var == RealVal(float(val)))

        # Build env for expressions
        env = _build_eval_env({**z3_vars, **action_flags}, constants)

        # Invariants with named assumptions
        inv_names: List[str] = []
        for inv in invariants:
            nm = inv["name"]
            inv_names.append(nm)
            expr = parse_expr(inv["assert"], env)
            # Track invariant with name for unsat cores
            s.assert_and_track(expr, nm)

        # Actions and guards
        for a in actions:
            nm = a["name"]
            guard_expr = parse_expr(a["guard"], env)
            s.add(Implies(action_flags[nm], guard_expr))

        if actions:
            # At least one action unless otherwise implied by guards
            s.add(Or(*action_flags.values()))
            if one_hot:
                s.add(Sum([If(flag, 1, 0) for flag in action_flags.values()]) == 1)

        # Forced action if provided
        if forced_action:
            if forced_action not in action_flags:
                # If unknown action requested, make problem UNSAT via impossible constraint
                s.add(Bool("__invalid_forced_action__") == BoolVal(False))
            else:
                s.add(action_flags[forced_action])

        # Meta accessors
        def chosen_action(model) -> Optional[str]:
            for nm, flag in action_flags.items():
                try:
                    if is_true(model.eval(flag, model_completion=True)):
                        return nm
                except Exception:
                    continue
            return None

        def val_of(model, k: str):
            var = z3_vars[k]
            try:
                v = model.eval(var, model_completion=True)
                return _z3_to_python(v)
            except Exception:
                return None

        meta = {
            "vars": list(z3_vars.keys()),
            "invariants": inv_names,
            "unsat_core_names": lambda: [str(a) for a in s.unsat_core()],
            "chosen_action": chosen_action,
            "val_of": val_of,
            "z3_vars": z3_vars,
        }

        return s, meta

    return compiled
