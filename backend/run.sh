#!/bin/bash
# Run Toxic Cybercafe Admin backend inside the virtualenv

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

source venv/bin/activate
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
