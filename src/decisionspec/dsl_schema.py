from typing import Any, Dict


# Lightweight schema description for reference; no strict validation to avoid extra deps.
DSL_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["id", "entities", "invariants"],
    "properties": {
        "id": {"type": "string"},
        "entities": {
            "type": "object",
            "properties": {
                "Reals": {"type": "array", "items": {"type": "string"}},
                "Ints": {"type": "array", "items": {"type": "string"}},
                "Bools": {"type": "array", "items": {"type": "string"}},
            },
        },
        "constants": {"type": "object"},
        "invariants": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "assert"],
                "properties": {
                    "name": {"type": "string"},
                    "assert": {"type": "string"},
                },
            },
        },
        "actions": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "guard"],
                "properties": {
                    "name": {"type": "string"},
                    "guard": {"type": "string"},
                },
            },
        },
        "one_hot_actions": {"type": "boolean"},
    },
}


def validate_minimal(spec: Dict[str, Any]) -> None:
    """Minimal runtime checks to avoid silent errors without introducing jsonschema dependency."""
    if not isinstance(spec, dict):
        raise ValueError("spec must be a dict")
    for k in ["id", "entities", "invariants"]:
        if k not in spec:
            raise ValueError(f"missing required field: {k}")
    if not isinstance(spec["entities"], dict):
        raise ValueError("entities must be a dict")
    if not isinstance(spec["invariants"], list):
        raise ValueError("invariants must be a list")

