from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
API_BASE = os.environ.get("CHECK_API_BASE", "http://localhost:8000/api").rstrip("/")
FRONTEND_URL = os.environ.get("CHECK_FRONTEND_URL", "http://localhost:3000").rstrip("/")
EXPECTED_SCENARIOS = {
    "Normal Scenario",
    "Congestion Scenario",
    "Demand Surge Scenario",
    "Resource Shortage Scenario",
    "Blocked Road Scenario",
    "High Priority Rescue Scenario",
}


def pass_line(name: str, detail: str = "") -> bool:
    suffix = f" - {detail}" if detail else ""
    print(f"[PASS] {name}{suffix}")
    return True


def fail_line(name: str, detail: str) -> bool:
    print(f"[FAIL] {name} - {detail}")
    return False


def request_json(url: str, timeout: float = 5.0) -> dict[str, Any]:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        payload = response.read().decode("utf-8")
    data = json.loads(payload)
    if not isinstance(data, dict):
        raise ValueError("response is not a JSON object")
    return data


def request_text(url: str, timeout: float = 5.0) -> str:
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return response.read(512).decode("utf-8", errors="replace")


def check_health() -> bool:
    name = "backend health"
    try:
        payload = request_json(f"{API_BASE}/health")
        status = payload.get("data", {}).get("status")
        if payload.get("success") is True and status == "healthy":
            return pass_line(name, "FastAPI reports healthy")
        return fail_line(name, f"unexpected payload: {payload}")
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        return fail_line(name, str(exc))


def check_frontend() -> bool:
    name = "frontend reachable"
    try:
        body = request_text(FRONTEND_URL)
        if body:
            return pass_line(name, FRONTEND_URL)
        return fail_line(name, "empty response body")
    except (urllib.error.URLError, TimeoutError) as exc:
        return fail_line(name, str(exc))


def check_scenarios() -> tuple[bool, int | None]:
    name = "seed scenarios"
    try:
        payload = request_json(f"{API_BASE}/scenarios")
        scenarios = payload.get("data", [])
        if not isinstance(scenarios, list):
            return fail_line(name, "data is not a list"), None
        names = {str(item.get("name")) for item in scenarios if isinstance(item, dict)}
        missing = sorted(EXPECTED_SCENARIOS - names)
        if missing:
            return fail_line(name, f"missing scenarios: {', '.join(missing)}"), None
        standard = next(
            (item for item in scenarios if isinstance(item, dict) and item.get("name") in EXPECTED_SCENARIOS),
            None,
        )
        scenario_id = standard.get("id") if standard else None
        if not isinstance(scenario_id, int):
            return fail_line(name, "no standard scenario has an integer id"), None
        return pass_line(name, f"{len(scenarios)} scenarios available"), scenario_id
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        return fail_line(name, str(exc)), None


def check_network(scenario_id: int | None) -> bool:
    name = "database and network data"
    if scenario_id is None:
        return fail_line(name, "skipped because no scenario id was available")
    try:
        payload = request_json(f"{API_BASE}/scenarios/{scenario_id}/network")
        data = payload.get("data", {})
        required = ("nodes", "edges", "vehicles", "demands")
        empty = [key for key in required if not data.get(key)]
        if empty:
            return fail_line(name, f"empty collections: {', '.join(empty)}")
        return pass_line(
            name,
            f"{len(data['nodes'])} nodes, {len(data['edges'])} edges, {len(data['vehicles'])} vehicles, {len(data['demands'])} demands",
        )
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        return fail_line(name, str(exc))


def backend_python() -> str:
    candidates = [
        BACKEND / ".venv" / "Scripts" / "python.exe",
        BACKEND / ".venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return sys.executable


def check_pytest() -> bool:
    name = "backend pytest"
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite+pysqlite://"
    env["AUTO_SEED_DEFAULTS"] = "false"
    try:
        result = subprocess.run(
            [backend_python(), "-m", "pytest", "-q"],
            cwd=BACKEND,
            env=env,
            text=True,
            capture_output=True,
            timeout=120,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return fail_line(name, str(exc))
    if result.returncode == 0:
        summary = result.stdout.strip().splitlines()[-1] if result.stdout.strip() else "pytest passed"
        return pass_line(name, summary)
    detail = (result.stdout + "\n" + result.stderr).strip()
    return fail_line(name, detail[-1200:])


def main() -> int:
    checks: list[bool] = []
    checks.append(check_health())
    checks.append(check_frontend())
    scenarios_ok, scenario_id = check_scenarios()
    checks.append(scenarios_ok)
    checks.append(check_network(scenario_id))
    checks.append(check_pytest())
    if all(checks):
        print("[PASS] project acceptance check completed")
        return 0
    print("[FAIL] project acceptance check found issues")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
