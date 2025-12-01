# backend/cnn_predictor.py
import os
import json
import time
import traceback
from typing import Optional, List

import numpy as np
import pydicom
import cv2
from tensorflow.keras.models import load_model

import database
from sqlalchemy.orm import Session

# --- Config ---
BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
MODEL_CANDIDATE_PATHS = [
    os.path.join(BASE_DIR, "models", "cnn_parkinson_model.h5"),
    "/kaggle/working/cnn_parkinson_model.h5",
    os.path.join(BASE_DIR, "cnn_parkinson_model.h5"),
]

TARGET_SHAPE = (128, 128)

# --- Load model (attempt several locations) ---
_model = None
_model_path_used = None
for p in MODEL_CANDIDATE_PATHS:
    if os.path.exists(p):
        _model = load_model(p)
        _model_path_used = p
        break

if _model is None:
    # Model not found at import time. We'll lazily load later in analyze_case.
    pass
else:
    print(f"[cnn_predictor] loaded model from: {_model_path_used}")

def _lazy_load_model():
    global _model, _model_path_used
    if _model is not None:
        return _model
    for p in MODEL_CANDIDATE_PATHS:
        if os.path.exists(p):
            _model = load_model(p)
            _model_path_used = p
            print(f"[cnn_predictor] lazy-loaded model from: {_model_path_used}")
            return _model
    raise FileNotFoundError("Model .h5 not found in candidate paths. Put cnn_parkinson_model.h5 in backend/models/")

def _preprocess_from_path(filepath: str):
    """
    Read DICOM from disk and return np.array shaped (1,128,128,3) as float32.
    """
    dcm = pydicom.dcmread(filepath)
    img = dcm.pixel_array.astype(np.float32)
    # min-max normalization
    img = (img - img.min()) / (img.max() - img.min() + 1e-5)
    # resize
    img = cv2.resize(img, TARGET_SHAPE, interpolation=cv2.INTER_AREA)
    # add channel
    if img.ndim == 2:
        img = img[..., np.newaxis]
    # convert to 3 channels (RGB) by repeating
    img = np.repeat(img, 3, axis=-1)
    img = np.expand_dims(img, axis=0).astype(np.float32)
    return img

def _get_image_filepaths_for_case(db: Session, case_id: str) -> List[str]:
    """
    Return absolute file paths to images for a case.
    """
    # import models here to avoid circular import at module level
    import models as models_module
    imgs = db.query(models_module.MRIImage).filter(models_module.MRIImage.case_id == case_id).all()
    filepaths = []
    for im in imgs:
        # im.file_path is like '/uploads/<filename>' or may be None; fallback to filename
        if getattr(im, "file_path", None):
            rel = im.file_path.lstrip("/")
            abs_path = os.path.join(os.path.dirname(__file__), rel)
        else:
            abs_path = os.path.join(UPLOAD_DIR, im.filename)
        if os.path.exists(abs_path):
            filepaths.append(abs_path)
    return filepaths

def analyze_case(case_id: str, provided_db: Optional[Session] = None):
    """
    Analyze a case: load images, run model, update case.cnn_prediction and case.status.
    This function can be scheduled as a background task. It will open its OWN DB session
    if provided_db is None or is not usable.
    """
    start_time = time.time()
    print(f"[cnn_predictor] analyze_case started for case {case_id}")

    # Obtain a DB session: prefer creating a new session rather than reusing web-request session
    db = None
    new_session_created = False
    try:
        if provided_db is not None:
            # Try to use provided DB if looks like a Session instance
            try:
                # quick test: use provided_db to query a small thing
                _ = provided_db.execute("SELECT 1")
                db = provided_db
                print("[cnn_predictor] using provided DB session (careful: ensure it's still open)")
            except Exception:
                db = None

        if db is None:
            # create a fresh session
            try:
                SessionLocal = getattr(database, "SessionLocal")
                db = SessionLocal()
                new_session_created = True
                print("[cnn_predictor] opened new DB session via database.SessionLocal")
            except Exception:
                # fallback to using generator get_db
                try:
                    gen = database.get_db()
                    db = next(gen)
                    # Note: get_db yields and might require closing; we'll attempt to close afterwards
                    print("[cnn_predictor] opened DB session via next(database.get_db())")
                    new_session_created = True
                except Exception as e:
                    print("[cnn_predictor] ERROR: cannot open DB session:", e)
                    raise

        # Import models lazily
        import models as models_module

        # Fetch image filepaths
        filepaths = _get_image_filepaths_for_case(db, case_id)
        if not filepaths:
            print(f"[cnn_predictor] No image files found for case {case_id}. Marking as analyzed=no_images.")
            case = db.query(models_module.MedicalCase).filter(models_module.MedicalCase.id == case_id).first()
            if case:
                case.cnn_prediction = "no_images"
                case.status = "analyzed"
                db.commit()
            return

        # load model
        model = _lazy_load_model()

        # Predict per image
        probs_list = []
        labels_list = []
        for fp in filepaths:
            try:
                x = _preprocess_from_path(fp)
                pred = model.predict(x)
                # pred shape (1, num_classes)
                pred = np.asarray(pred).reshape(-1)
                probs_list.append(pred.tolist())
                labels_list.append(int(np.argmax(pred)))
            except Exception as e:
                print(f"[cnn_predictor] failed to predict {fp}: {e}")
                traceback.print_exc()
                continue

        if not probs_list:
            print(f"[cnn_predictor] Could not compute predictions for any image in case {case_id}")
            case = db.query(models_module.MedicalCase).filter(models_module.MedicalCase.id == case_id).first()
            if case:
                case.cnn_prediction = "pred_failed"
                case.status = "analyzed"
                db.commit()
            return

        # average probabilities across images
        avg_probs = np.mean(np.array(probs_list), axis=0)  # e.g. [p_malade, p_sain]
        predicted_index = int(np.argmax(avg_probs))
        # Map index to label consistent with your training mapping: earlier you used ["Malade","Sain"]
        label_map = ["Malade", "Sain"]
        predicted_label = label_map[predicted_index]
        predicted_prob = float(avg_probs[predicted_index])
        predicted_confidence = float(np.max(avg_probs))

        # Update case in DB: write string label and numeric values
        case = db.query(models_module.MedicalCase).filter(models_module.MedicalCase.id == case_id).first()
        if case:
            case.cnn_prediction = predicted_label
            # numeric fields (may require migration to exist)
            try:
                case.cnn_prediction_num = predicted_prob
            except Exception:
                pass
            try:
                case.cnn_confidence = predicted_confidence
            except Exception:
                pass
            case.status = "analyzed"
            case.updated_at = database.datetime.utcnow() if hasattr(database, "datetime") else None
            db.commit()
            print(f"[cnn_predictor] case {case_id} updated: {case.cnn_prediction}:{predicted_prob:.4f}")

        elapsed = time.time() - start_time
        print(f"[cnn_predictor] analyze_case finished for {case_id} in {elapsed:.1f}s")

    except Exception as e:
        print("[cnn_predictor] Exception in analyze_case:", e)
        traceback.print_exc()
    finally:
        # close session if we created one here
        try:
            if new_session_created and db is not None:
                db.close()
                # if using generator get_db, try to close generator
        except Exception:
            pass

# convenience synchronous runner (for local testing)
def run_analysis_for_case(case_id: str):
    analyze_case(case_id)
