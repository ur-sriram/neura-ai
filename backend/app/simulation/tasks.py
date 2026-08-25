from app.db.session import SessionLocal
from app.services.simulation_service import run_algorithms
from app.worker import celery_app


@celery_app.task(name="run_simulation")
def run_simulation_task(scenario_id: int, algorithms: list[str], objective: str, parameters: dict) -> int:
    with SessionLocal() as db:
        run = run_algorithms(db, scenario_id, algorithms, objective, parameters)
        return run.id

