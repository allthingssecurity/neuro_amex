# Placeholder for counterfactual fairness probes.

def counterfactual_unchanged(decide_fn, facts, flip_key: str, flip_value):
    base = decide_fn(facts, mode="hard")
    alt = dict(facts)
    alt[flip_key] = flip_value
    changed = decide_fn(alt, mode="hard")
    return base.get("decision") == changed.get("decision")

