# 🧠 Neuro-Symbolic Decision Engine (Amex-like Flows)

A hybrid LLM + Z3 decision service for card-not-present authorization, dispute routing, and credit line increase. Combines LLM proposal & explanation with Z3 verification & repair, enabling auditable, constraint-guaranteed decisions.

---

## 🎯 Project Brief

Goal: Build a decision service with two execution modes:
- Hard path (sync, <100ms): Z3-only, precompiled constraints.
- Soft path (async): LLM proposes → Z3 verifies → LLM repairs → Z3 re-verifies.

Primary Flow: Card-not-present (CNP) transaction authorization
Secondary Flows: Dispute routing, Credit Line Increase (CLI)

---

## 🗂️ 1. Repository Layout

```
neurosym-amex/
  pyproject.toml
  README.md
  src/
    decisionspec/
      __init__.py
      dsl_schema.py           # JSONSchema for the policy DSL
      compiler.py             # DSL -> Z3 builder
      invariants.py           # shared invariant constructors (placeholder)
    engine/
      __init__.py
      model_types.py          # Pydantic models for inputs/outputs
      verifier.py             # Z3 wrapper (sat/unsat-core/model)
      proposer.py             # LLM interface with strict JSON outputs (mock)
      repair.py               # LLM repair using unsat core (mock)
      router.py               # synchronous API routing
      explainer.py            # NL explanation generator
      fairness.py             # counterfactual probes (placeholder)
    policies/
      auth_v1.yaml            # example DecisionSpec
      disputes_v1.yaml
      cli_v1.yaml
    tests/
      test_auth_end_to_end.py
  scripts/
    serve_local.py
    compile_policies.py
  infra/
    dockerfile
    dev.env.example
```

---

## 📦 2. Core Contracts (Pydantic/JSON)

See inline examples in the code and comments. Runtime facts are flattened into DSL variables; solver output includes satisfiability, chosen action, model snapshot and unsat core.

---

## 📝 3. Policy DSL (DecisionSpec) & Compiler

Minimal YAML DSL → Z3 compilation. See `src/policies/auth_v1.yaml` and `src/decisionspec/compiler.py`.

---

## 🔍 4. Z3 Verifier Wrapper

`src/engine/verifier.py` provides a thin layer around the compiled policy to return a typed dict with fields required by the router and explainer.

---

## 🤖 5. LLM Interfaces (Strict JSON)

`src/engine/proposer.py` and `src/engine/repair.py` ship as deterministic mocks returning strict JSON; they can be swapped for a real LLM via env flag.

---

## 🔁 6. Router (Orchestration)

`src/engine/router.py` wires hard/soft paths and compiles the default auth policy on import.

---

## 💬 7. Explanation Templates

`src/engine/explainer.py` returns deterministic, audit-friendly strings based on action and solver proof info.

---

## ✅ 8. Property Tests

`src/tests/test_auth_end_to_end.py` covers a minimal soft-path repair scenario. Extend with monotonicity and fairness probes as needed.

---

## 🖥️ 9. CLI & Service

`scripts/serve_local.py` exposes `/decide` via FastAPI. Use `mode=hard` or `mode=soft`.

---

## 🔐 10. Security & PII Handling

- Never pass PAN/PII to LLM.
- Only derived features are used (risk, velocity, MCC).

---

## 🛠️ 11. Get Started

- Install: `pip install -e .`
- Run API: `uvicorn scripts.serve_local:app --reload`
- Compile policies cache: `python scripts/compile_policies.py`

---

## ✅ 12. Acceptance Checklist

- `POST /decide` returns an action with proof fields.
- Hard path uses Z3-only decisions; soft path tries propose→verify→repair.
- Policies are YAML + compiled SMT with version.

---

## 🌐 GitHub Pages Demo

- A static, self-contained demo lives in `docs/` and runs entirely in the browser (no backend required).
- It mirrors the LLM (mock extraction) and Z3 (JS verifier) steps so it can be hosted via GitHub Pages.

Enable Pages:
- Push this repo to GitHub.
- In Settings → Pages, set “Source” to “Deploy from a branch”, branch to your default branch (e.g., `main`), and folder to `/docs`.
- Visit the published URL to interact with the step-by-step demo.
