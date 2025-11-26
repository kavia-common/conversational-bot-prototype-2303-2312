# Running locally

1. Create a virtual environment and install dependencies:
   - python -m venv .venv
   - source .venv/bin/activate
   - pip install -r requirements.txt

2. Copy .env.example to .env and fill values as needed.

3. Start the server:
   - uvicorn app:app --host 0.0.0.0 --port 8080

Frontend:
- Set REACT_APP_API_BASE=http://localhost:8080
- Open the app and configure Settings from the TopBar.
