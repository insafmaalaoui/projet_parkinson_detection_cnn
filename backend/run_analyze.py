#!/usr/bin/env python
"""
Usage: python run_analyze.py <case_id>
Runs `analyze_case` for the given case id and prints the result fields.
"""
import sys
from database import SessionLocal
from backend.cnn_predictor import _ensure_tf_and_model, analyze_case
import asyncio
import models

if len(sys.argv) < 2:
    print("Usage: python run_analyze.py <case_id>")
    sys.exit(1)

case_id = sys.argv[1]

db = SessionLocal()
print("Ensuring model availability...")
ready = _ensure_tf_and_model()
print("Model ready:", ready)

print(f"Running analysis for case {case_id}...")
asyncio.run(analyze_case(case_id, db))

case = db.query(models.MedicalCase).filter(models.MedicalCase.id == case_id).first()
if not case:
    print("Case not found")
else:
    print("After analyze -> status:", case.status)
    print("cnn_prediction:", case.cnn_prediction)
    print("cnn_confidence:", case.cnn_confidence)

db.close()
