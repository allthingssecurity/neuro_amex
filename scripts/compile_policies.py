import os
import sys
import pickle
import yaml

# Ensure src/ is importable when running without install
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(BASE_DIR, "src")
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from decisionspec.compiler import compile as compile_spec  # noqa: E402


def main():
    policies_dir = os.path.join(SRC_DIR, "policies")
    cache_dir = os.path.join(BASE_DIR, ".cache", "policies")
    os.makedirs(cache_dir, exist_ok=True)

    for file in os.listdir(policies_dir):
        if file.endswith(".yaml"):
            with open(os.path.join(policies_dir, file)) as f:
                spec = yaml.safe_load(f)
            compiled = compile_spec(spec)
            out_path = os.path.join(cache_dir, f"{spec['id']}.pkl")
            with open(out_path, "wb") as p:
                pickle.dump(compiled, p)
            print(f"Compiled and cached: {file} -> {out_path}")


if __name__ == "__main__":
    main()

