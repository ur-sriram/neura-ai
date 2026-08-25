.PHONY: dev up down logs test backend-test frontend-build seed lint clean check

dev:
	docker compose up --build

up: dev

down:
	docker compose down

logs:
	docker compose logs -f

test:
	cd backend && DATABASE_URL=sqlite+pysqlite:// AUTO_SEED_DEFAULTS=false python -m pytest -q
	cd frontend && npm run build

backend-test:
	cd backend && DATABASE_URL=sqlite+pysqlite:// AUTO_SEED_DEFAULTS=false python -m pytest -q

frontend-build:
	cd frontend && npm run build

seed:
	docker compose exec backend python -m app.seeds.seed_data

lint:
	cd backend && ruff check app
	cd frontend && npm run build

check:
	python scripts/check_project.py

clean:
	python -c "import pathlib, shutil; targets=['backend/.pytest_cache','backend/.ruff_cache','frontend/.next']; [shutil.rmtree(pathlib.Path(t), ignore_errors=True) for t in targets]"
	python -c "import pathlib; [p.unlink() for p in pathlib.Path('backend').glob('*.log')]; [p.unlink() for p in pathlib.Path('backend').glob('*.pid')]; [p.unlink() for p in pathlib.Path('backend').glob('*.job')]"
