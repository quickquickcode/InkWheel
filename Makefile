.PHONY: backend-install frontend-install install backend-dev frontend-dev backend-test frontend-test test frontend-build

backend-install:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

frontend-install:
	cd frontend && npm install

install: backend-install frontend-install

backend-dev:
	cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

frontend-dev:
	cd frontend && npm run dev -- --host 127.0.0.1 --port 5173

backend-test:
	cd backend && .venv/bin/pytest

frontend-test:
	cd frontend && npm test

test: backend-test frontend-test

frontend-build:
	cd frontend && npm run build
