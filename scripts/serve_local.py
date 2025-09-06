import os
import sys
from fastapi import FastAPI, HTTPException

# Ensure src/ is importable when running without install
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from engine.router import decide  # noqa: E402
from engine.model_types import flatten_facts  # noqa: E402


app = FastAPI()


@app.post("/decide")
def run_decision(facts: dict, mode: str = "soft"):
    flat = flatten_facts(facts)
    try:
        return decide(flat, mode=mode)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/healthz")
def health():
    return {"status": "ok"}

