import asyncio
import sys
import os
import importlib.util

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

def load_module(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

async def run_full_ml_pipeline():
    print("Starting NE-Setu ML Training Pipeline...")
    
    base_dir = os.path.dirname(__file__)
    c_mod = load_module("generate_corpus", os.path.join(base_dir, "01_generate_corpus.py"))
    h_mod = load_module("train_hazard", os.path.join(base_dir, "02_train_hazard.py"))
    e_mod = load_module("train_eta", os.path.join(base_dir, "03_train_eta.py"))
    ev_mod = load_module("eval", os.path.join(base_dir, "04_eval.py"))

    print("\n--- Step 1: Generate Training Corpora ---")
    await c_mod.generate_corpora()

    print("\n--- Step 2: Train Hazard Model ---")
    h_metrics = h_mod.train_hazard()

    print("\n--- Step 3: Train ETA Model ---")
    eta_metrics = e_mod.train_eta()

    print("\n--- Step 4: Write EVAL.md ---")
    ev_mod.generate_eval_md(h_metrics, eta_metrics)

    print("\nML Training Pipeline completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_full_ml_pipeline())
