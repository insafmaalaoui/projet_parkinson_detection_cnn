from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
import shutil
import uuid as _uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from datetime import date as _date
import jwt
import os
from typing import List, Optional
import asyncio
from pydantic import BaseModel, EmailStr
import database
import models
import schemas
import auth

import cnn_predictor as cnn_predictor
import sys
import os
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)

# Ensure project root is on sys.path so we can import the chatbot module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
try:
    from chatbot import chatbot_service
except Exception:
    chatbot_service = None
    # Try a fallback: load chatbot_service.py directly from chatbot folder
    try:
        import importlib.util
        chatbot_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'chatbot', 'chatbot_service.py'))
        if os.path.exists(chatbot_path):
            spec = importlib.util.spec_from_file_location('chatbot_service', chatbot_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)  # type: ignore
            chatbot_service = module
    except Exception as e:
        print(f"⚠️ Impossible de charger chatbot_service automatiquement: {e}")



#Initialize database
database.init_db()

app = FastAPI(title="MediDiagnose API", version="1.0.0")


def _coerce_prediction_value(val):
    """Coerce stored prediction value into a float or None.

    Handles None, floats, numeric strings, or strings like 'Malade:0.9754'.
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip()
    if ':' in s:
        s = s.split(':')[-1]
    try:
        return float(s)
    except Exception:
        return None

# Ensure uploads directory exists and serve it
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get('/uploads/previews/{filename}')
def preview_png(filename: str):
    """Return or generate a PNG preview for a .dcm file stored in uploads.
    Example: GET /uploads/previews/96d789811d1a41c98a06bd95cacff857.png
    This will look for uploads/96d789811d1a41c98a06bd95cacff857.dcm and generate a PNG under uploads/previews/.
    """
    # disallow path traversal
    if '..' in filename or filename.startswith('/'):
        raise HTTPException(status_code=400, detail='Invalid filename')

    previews_dir = os.path.join(UPLOAD_DIR, 'previews')
    os.makedirs(previews_dir, exist_ok=True)

    # normalize requested png filename
    if filename.lower().endswith('.png'):
        png_name = filename
        base_name = filename[:-4]
    else:
        png_name = f"{filename}.png"
        base_name = filename

    png_path = os.path.join(previews_dir, png_name)

    # If preview already exists, return it
    if os.path.exists(png_path):
        return FileResponse(png_path, media_type='image/png')

    # Locate the corresponding .dcm file
    dcm_candidates = [
        os.path.join(UPLOAD_DIR, base_name + '.dcm'),
        os.path.join(UPLOAD_DIR, base_name),
    ]

    dcm_path = None
    for c in dcm_candidates:
        if os.path.exists(c):
            dcm_path = c
            break

    if not dcm_path:
        raise HTTPException(status_code=404, detail='DICOM file not found')

    # Generate PNG preview on-demand. Import heavy libs lazily to avoid import-time errors.
    try:
        from pydicom import dcmread
        from PIL import Image
        import numpy as np
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Missing Python imaging dependencies: {e}. Install pydicom, pillow, numpy.")

    try:
        ds = dcmread(dcm_path)
        arr = ds.pixel_array.astype(float)
        # normalize to 0-255
        if arr.max() == arr.min():
            norm = np.zeros_like(arr, dtype='uint8')
        else:
            norm = ((arr - arr.min()) / (arr.max() - arr.min()) * 255.0).astype('uint8')

        img = Image.fromarray(norm)
        # ensure RGB for compatibility
        if img.mode != 'RGB':
            img = img.convert('L')

        img.save(png_path)
        return FileResponse(png_path, media_type='image/png')
    except Exception as e:
        # don't leak internals
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {e}")


# Compatibility fallback: some older frontend bundles request bare filenames like `/abcd1234.png`.
# Add a small redirect so those requests are forwarded to `/uploads/previews/abcd1234.png`
# or to `/uploads/abcd1234.dcm` if a preview isn't present.
@app.get('/{name}.png')
def redirect_bare_png(name: str):
    # disallow path traversal
    if '..' in name or name.startswith('/'):
        raise HTTPException(status_code=400, detail='Invalid filename')

    previews_dir = os.path.join(UPLOAD_DIR, 'previews')
    png_name = f"{name}.png"
    png_path = os.path.join(previews_dir, png_name)

    # If preview exists, redirect to it
    if os.path.exists(png_path):
        return RedirectResponse(url=f"/uploads/previews/{png_name}", status_code=307)

    # If no preview, but underlying .dcm exists, redirect to the original .dcm file
    dcm_path = os.path.join(UPLOAD_DIR, f"{name}.dcm")
    if os.path.exists(dcm_path):
        return RedirectResponse(url=f"/uploads/{name}.dcm", status_code=307)

    # Not found
    raise HTTPException(status_code=404, detail='Preview not found')

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= AUTH ROUTES =============

@app.post("/auth/register")
def register(user_data: schemas.UserRegister, db: Session = Depends(database.get_db)):
    """Register a new user"""
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.hash_password(user_data.password)
    user = models.User(
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        speciality=user_data.speciality,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"message": "User registered successfully", "user_id": user.id}


@app.post("/auth/login")
def login(credentials: schemas.UserLogin, db: Session = Depends(database.get_db)):
    """Login user and return JWT token"""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.role != credentials.role:
        raise HTTPException(status_code=401, detail="Invalid role")
    
    token = auth.create_access_token(data={"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


# ============= PATIENT ROUTES =============

@app.post("/cases/create")
async def create_case(
    files: List[UploadFile] = File(...),
    description: str = Form(""),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Create a new patient case with MRI images"""
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can create cases")
    
    case = models.MedicalCase(
        patient_id=current_user.id,
        description=description,
        status="pending",
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    
    # Save images to disk and create MRIImage records
    created_images = []
    for file in files:
        try:
            orig_name = getattr(file, 'filename', 'upload')
            ext = os.path.splitext(orig_name)[1]
            unique_name = f"{_uuid.uuid4().hex}{ext}"
            dest_path = os.path.join(UPLOAD_DIR, unique_name)
            with open(dest_path, 'wb') as out_file:
                shutil.copyfileobj(file.file, out_file)

            image = models.MRIImage(case_id=case.id, filename=unique_name, file_path=f"/uploads/{unique_name}")
            db.add(image)
            db.commit()
            db.refresh(image)
            created_images.append({"id": image.id, "filename": image.filename, "url": image.file_path})
        except Exception:
            # if saving one file fails, skip it but continue processing others
            continue
    
    # Decide whether the model is available now. cnn_predictor provides _lazy_load_model()
    model_ready = False
    try:
        if hasattr(cnn_predictor, '_lazy_load_model'):
            try:
                # Try to lazy-load model; if it succeeds model is ready.
                cnn_predictor._lazy_load_model()
                model_ready = True
            except Exception:
                model_ready = False
    except Exception:
        model_ready = False

    if model_ready:
        # Run analysis in a thread and wait so we can return prediction in response.
        try:
            await asyncio.to_thread(cnn_predictor.analyze_case, case.id)
            # refresh case from DB to get updated prediction
            db.refresh(case)
            # IMPORTANT: Do NOT return the CNN prediction to the patient. The neurologist should be the
            # only one to view model outputs. Return case metadata only.
            return {
                "case_id": case.id,
                "message": "Case created and analyzed",
                "images": created_images,
                "status": case.status,
            }
        except Exception as e:
            # If synchronous analysis fails, fall back to queuing it and return queued response
            try:
                asyncio.create_task(asyncio.to_thread(cnn_predictor.analyze_case, case.id))
            except Exception:
                pass
            return {"case_id": case.id, "message": "Case created (analysis attempted, queued on failure)", "images": created_images}
    else:
        # Model not ready: queue background analysis (do NOT pass request DB session)
        try:
            asyncio.create_task(asyncio.to_thread(cnn_predictor.analyze_case, case.id))
        except Exception:
            # last resort: call synchronously (will run during request)
            try:
                cnn_predictor.analyze_case(case.id)
            except Exception:
                pass
        return {"case_id": case.id, "message": "Case created and analysis queued", "images": created_images}


@app.get("/cases")
def get_patient_cases(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Get all cases for a patient"""
    cases = db.query(models.MedicalCase).filter(
        models.MedicalCase.patient_id == current_user.id
    ).all()
    
    # Do NOT include model predictions in patient-facing list responses.
    return [{
        "id": case.id,
        "created_at": case.created_at,
        "status": case.status,
        "neurologist_report": case.neurologist_report,
        "images_count": len(case.images),
        "report_pdf": getattr(case, 'report_pdf', None),
    } for case in cases]


@app.patch("/cases/{case_id}")
def update_case(
    case_id: str,
    payload: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Allow patient to update their case (description)"""
    case = db.query(models.MedicalCase).filter(models.MedicalCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if "description" in payload:
        case.description = payload.get("description")
    case.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Case updated"}


@app.post("/cases/{case_id}/images")
async def upload_case_images(
    case_id: str,
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Upload additional images for an existing case (patient only)"""
    case = db.query(models.MedicalCase).filter(models.MedicalCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    created = []
    for file in files:
        # save file to disk
        orig_name = getattr(file, 'filename', 'upload')
        ext = os.path.splitext(orig_name)[1]
        unique_name = f"{_uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(dest_path, 'wb') as out_file:
            shutil.copyfileobj(file.file, out_file)

        image = models.MRIImage(case_id=case.id, filename=unique_name, file_path=f"/uploads/{unique_name}")
        db.add(image)
        db.commit()
        db.refresh(image)
        created.append({"id": image.id, "filename": image.filename, "url": image.file_path})

    return {"message": "Images uploaded", "images": created}


@app.delete("/cases/{case_id}/images/{image_id}")
def delete_case_image(
    case_id: str,
    image_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Delete an image from a case (patient only)"""
    image = db.query(models.MRIImage).filter(models.MRIImage.id == image_id, models.MRIImage.case_id == case_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    case = db.query(models.MedicalCase).filter(models.MedicalCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(image)
    # remove file from disk if present
    try:
        if image.file_path:
            # image.file_path expected like '/uploads/<filename>'
            fp = os.path.join(os.path.dirname(__file__), image.file_path.lstrip('/'))
            if os.path.exists(fp):
                os.remove(fp)
    except Exception:
        pass
    db.commit()
    return {"message": "Image deleted"}


@app.delete("/cases/{case_id}")
def delete_case(
    case_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Delete a case and its images (patient only)"""
    case = db.query(models.MedicalCase).filter(models.MedicalCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.patient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # delete images
    imgs = db.query(models.MRIImage).filter(models.MRIImage.case_id == case.id).all()
    for img in imgs:
        try:
            if img.file_path:
                fp = os.path.join(os.path.dirname(__file__), img.file_path.lstrip('/'))
                if os.path.exists(fp):
                    os.remove(fp)
        except Exception:
            pass
        db.delete(img)
    db.delete(case)
    db.commit()
    return {"message": "Case and images deleted"}

@app.get("/patients/info")
def get_patient_info(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Get the current patient's profile info"""
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can access their profile info")

    info = db.query(models.InfoPatient).filter(models.InfoPatient.user_id == current_user.id).first()
    if not info:
        return {"info": None}

    return {
        "info": {
            "id": info.id,
            "user_id": info.user_id,
            "first_name": info.first_name,
            "last_name": info.last_name,
            "date_of_birth": info.date_of_birth,
            "age": info.age,
            "gender": info.gender,
            "autres_maladies": info.autres_maladies,
            "details_autres_maladies": info.details_autres_maladies,
            "tremblements": info.tremblements,
            "rigidite": info.rigidite,
            "bradykinesie": info.bradykinesie,
            "difficulte_marche": info.difficulte_marche,
            "instabilite": info.instabilite,
            "expression_faciale_reduite": info.expression_faciale_reduite,
            "micrographie": info.micrographie,
            "fatigue": info.fatigue,
            "troubles_sommeil": info.troubles_sommeil,
            "troubles_cognitifs": info.troubles_cognitifs,
            "depression_anxiete": info.depression_anxiete,
            "perte_odorat": info.perte_odorat,
            "constipation": info.constipation,
            "problemes_urinaires": info.problemes_urinaires,
            "douleurs": info.douleurs,
            "observations": info.observations,
            "created_at": info.created_at,
            "updated_at": info.updated_at,
        }
    }

@app.post("/patients/info")
def upsert_patient_info(
    info_data: schemas.InfoPatientCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Create or update the patient's profile info"""
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can modify their profile info")

    info = db.query(models.InfoPatient).filter(models.InfoPatient.user_id == current_user.id).first()
    # DEBUG: log incoming payload to help troubleshoot missing fields
    try:
        print(f"[DEBUG] /patients/info payload: {info_data.dict()}")
    except Exception:
        print("[DEBUG] /patients/info received payload (could not dict())")
    # coerce date_of_birth (API sends ISO date string like 'YYYY-MM-DD') into a Python datetime
    dob_val = None
    if getattr(info_data, 'date_of_birth', None):
        try:
            # try ISO parse (YYYY-MM-DD or full datetime)
            dob_val = datetime.fromisoformat(info_data.date_of_birth)
        except Exception:
            try:
                dob_val = datetime.strptime(info_data.date_of_birth, "%Y-%m-%d")
            except Exception:
                dob_val = None

    if not info:
        info = models.InfoPatient(
            first_name=(info_data.first_name or current_user.first_name),
            last_name=(info_data.last_name or current_user.last_name),
            user_id=current_user.id,
            phone=info_data.phone,
            date_of_birth=dob_val,
            gender=info_data.gender,
            address=info_data.address,
            height_cm=info_data.height_cm,
            weight_kg=info_data.weight_kg,
            medical_history=info_data.medical_history,
            emergency_contact=info_data.emergency_contact,
            autres_maladies=getattr(info_data, 'autres_maladies', False),
            details_autres_maladies=getattr(info_data, 'details_autres_maladies', None),
            tremblements=getattr(info_data, 'tremblements', False),
            rigidite=getattr(info_data, 'rigidite', False),
            bradykinesie=getattr(info_data, 'bradykinesie', False),
            difficulte_marche=getattr(info_data, 'difficulte_marche', False),
            instabilite=getattr(info_data, 'instabilite', False),
            expression_faciale_reduite=getattr(info_data, 'expression_faciale_reduite', False),
            micrographie=getattr(info_data, 'micrographie', False),
            fatigue=getattr(info_data, 'fatigue', False),
            troubles_sommeil=getattr(info_data, 'troubles_sommeil', False),
            troubles_cognitifs=getattr(info_data, 'troubles_cognitifs', False),
            depression_anxiete=getattr(info_data, 'depression_anxiete', False),
            perte_odorat=getattr(info_data, 'perte_odorat', False),
            constipation=getattr(info_data, 'constipation', False),
            problemes_urinaires=getattr(info_data, 'problemes_urinaires', False),
            douleurs=getattr(info_data, 'douleurs', False),
            observations=getattr(info_data, 'observations', None),
        )
        db.add(info)
    else:
        # prefer incoming values, otherwise keep existing or fallback to user record
        info.first_name = info_data.first_name or getattr(info, 'first_name', None) or current_user.first_name
        info.last_name = info_data.last_name or getattr(info, 'last_name', None) or current_user.last_name
        info.phone = info_data.phone
        info.date_of_birth = dob_val
        info.gender = info_data.gender
        info.address = info_data.address
        info.height_cm = info_data.height_cm
        info.weight_kg = info_data.weight_kg
        info.medical_history = info_data.medical_history
        info.emergency_contact = info_data.emergency_contact
        info.autres_maladies = getattr(info_data, 'autres_maladies', False)
        info.details_autres_maladies = getattr(info_data, 'details_autres_maladies', None)
        info.tremblements = getattr(info_data, 'tremblements', False)
        info.rigidite = getattr(info_data, 'rigidite', False)
        info.bradykinesie = getattr(info_data, 'bradykinesie', False)
        info.difficulte_marche = getattr(info_data, 'difficulte_marche', False)
        info.instabilite = getattr(info_data, 'instabilite', False)
        info.expression_faciale_reduite = getattr(info_data, 'expression_faciale_reduite', False)
        info.micrographie = getattr(info_data, 'micrographie', False)
        info.fatigue = getattr(info_data, 'fatigue', False)
        info.troubles_sommeil = getattr(info_data, 'troubles_sommeil', False)
        info.troubles_cognitifs = getattr(info_data, 'troubles_cognitifs', False)
        info.depression_anxiete = getattr(info_data, 'depression_anxiete', False)
        info.perte_odorat = getattr(info_data, 'perte_odorat', False)
        info.constipation = getattr(info_data, 'constipation', False)
        info.problemes_urinaires = getattr(info_data, 'problemes_urinaires', False)
        info.douleurs = getattr(info_data, 'douleurs', False)
        info.observations = getattr(info_data, 'observations', None)
        info.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(info)

    return {"message": "Profile info saved", "info": {
        "id": info.id,
        "user_id": info.user_id,
        "phone": info.phone,
        "date_of_birth": info.date_of_birth,
        "gender": info.gender,
        "address": info.address,
        "height_cm": info.height_cm,
        "weight_kg": info.weight_kg,
        "medical_history": info.medical_history,
        "emergency_contact": info.emergency_contact,
        "created_at": info.created_at,
        "updated_at": info.updated_at,
    }}


# ============= NEUROLOGIST ROUTES =============

@app.get("/neurologist/cases")
def get_pending_cases(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Get pending cases for analysis"""
    if current_user.role != "neurologist":
        raise HTTPException(status_code=403, detail="Only neurologists can access this")
    
    cases = db.query(models.MedicalCase).filter(
        models.MedicalCase.status.in_(["pending", "analyzed"])
    ).all()
    
    out = []
    for case in cases:
        # prefer explicit numeric field, otherwise attempt to coerce from legacy string
        num = getattr(case, 'cnn_prediction_num', None)
        if num is None:
            num = _coerce_prediction_value(case.cnn_prediction)
        # confidence may be stored separately
        conf = getattr(case, 'cnn_confidence', None)
        if conf is None:
            conf = _coerce_prediction_value(case.cnn_prediction)

        out.append({
            "id": case.id,
            "patient_id": case.patient_id,
            "patient_name": f"{case.patient.first_name} {case.patient.last_name}",
            "status": case.status,
            "created_at": case.created_at,
            "cnn_prediction": case.cnn_prediction,
            "cnn_prediction_num": float(num) if num is not None else None,
            "cnn_confidence": float(conf) if conf is not None else None,
            "images_count": len(case.images),
        })
    return out


@app.get("/neurologist/treated")
def get_treated_cases(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Get cases that have been completed/treated"""
    if current_user.role != "neurologist":
        raise HTTPException(status_code=403, detail="Only neurologists can access this")

    cases = db.query(models.MedicalCase).filter(models.MedicalCase.status == "completed").all()
    out = []
    for case in cases:
        num = getattr(case, 'cnn_prediction_num', None)
        if num is None:
            num = _coerce_prediction_value(case.cnn_prediction)
        conf = getattr(case, 'cnn_confidence', None)
        if conf is None:
            conf = _coerce_prediction_value(case.cnn_prediction)

        out.append({
            "id": case.id,
            "patient_id": case.patient_id,
            "patient_name": f"{case.patient.first_name} {case.patient.last_name}",
            "status": case.status,
            "created_at": case.created_at,
            "cnn_prediction": case.cnn_prediction,
            "cnn_prediction_num": float(num) if num is not None else None,
            "cnn_confidence": float(conf) if conf is not None else None,
            "images_count": len(case.images),
            "report_pdf": getattr(case, 'report_pdf', None),
        })
    return out


@app.get('/neurologist/treated')
def get_treated_cases(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Get cases already treated/completed"""
    if current_user.role != "neurologist":
        raise HTTPException(status_code=403, detail="Only neurologists can access this")

    cases = db.query(models.MedicalCase).filter(models.MedicalCase.status == 'completed').all()
    out = []
    for case in cases:
        num = getattr(case, 'cnn_prediction_num', None)
        if num is None:
            num = _coerce_prediction_value(case.cnn_prediction)
        conf = getattr(case, 'cnn_confidence', None)
        if conf is None:
            conf = _coerce_prediction_value(case.cnn_prediction)

        out.append({
            "id": case.id,
            "patient_id": case.patient_id,
            "patient_name": f"{case.patient.first_name} {case.patient.last_name}",
            "status": case.status,
            "created_at": case.created_at,
            "cnn_prediction": case.cnn_prediction,
            "cnn_prediction_num": float(num) if num is not None else None,
            "cnn_confidence": float(conf) if conf is not None else None,
            "images_count": len(case.images),
            "report_pdf": getattr(case, 'report_pdf', None),
        })
    return out


@app.get("/neurologist/case/{case_id}")
def get_case_detail(
    case_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Get detailed case information"""
    case = db.query(models.MedicalCase).filter(models.MedicalCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # If neurologist requests this endpoint, also include patient's full info for quick review
    patient_info = None
    try:
        patient_info_obj = db.query(models.InfoPatient).filter(models.InfoPatient.user_id == case.patient_id).first()
        if patient_info_obj:
            patient_info = {
                'first_name': getattr(patient_info_obj, 'first_name', None),
                'last_name': getattr(patient_info_obj, 'last_name', None),
                'date_of_birth': getattr(patient_info_obj, 'date_of_birth', None),
                'age': getattr(patient_info_obj, 'age', None),
                'gender': getattr(patient_info_obj, 'gender', None),
                
            }
    except Exception:
        patient_info = None

    return {
        "id": case.id,
        "patient_name": f"{case.patient.first_name} {case.patient.last_name}",
        "description": case.description,
        "status": case.status,
        "cnn_prediction": case.cnn_prediction,
        "cnn_prediction_num": (float(getattr(case, 'cnn_prediction_num', None)) if getattr(case, 'cnn_prediction_num', None) is not None else _coerce_prediction_value(case.cnn_prediction)),
        "cnn_confidence": (float(getattr(case, 'cnn_confidence', None)) if getattr(case, 'cnn_confidence', None) is not None else _coerce_prediction_value(case.cnn_prediction)),
        "report_pdf": getattr(case, 'report_pdf', None),
        "patient_info": patient_info,
        "images": [{"id": img.id, "url": (img.file_path if getattr(img, 'file_path', None) else f"/uploads/{img.filename}"), "filename": img.filename} for img in case.images],
    }


@app.get("/neurologist/patients")
def get_all_patients(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Return list of patients and their InfoPatient records"""
    if current_user.role != "neurologist":
        raise HTTPException(status_code=403, detail="Only neurologists can access this")

    users = db.query(models.User).filter(models.User.role == 'patient').all()
    out = []
    for u in users:
        info = db.query(models.InfoPatient).filter(models.InfoPatient.user_id == u.id).first()
        out.append({
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "created_at": u.created_at,
            "info": {
                "phone": getattr(info, 'phone', None) if info else None,
                "date_of_birth": getattr(info, 'date_of_birth', None) if info else None,
                "age": getattr(info, 'age', None) if info else None,
                "gender": getattr(info, 'gender', None) if info else None,
                "address": getattr(info, 'address', None) if info else None,
            } if info else None
        })
    return out


@app.get('/neurologist/patient/{patient_id}')
def get_patient_detail(
    patient_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Return InfoPatient full record for a given patient id (neurologist only)."""
    if current_user.role != 'neurologist':
        raise HTTPException(status_code=403, detail='Only neurologists can access patient info')

    user = db.query(models.User).filter(models.User.id == patient_id, models.User.role == 'patient').first()
    if not user:
        raise HTTPException(status_code=404, detail='Patient not found')

    info = db.query(models.InfoPatient).filter(models.InfoPatient.user_id == user.id).first()
    if not info:
        return {"patient": {"id": user.id, "first_name": user.first_name, "last_name": user.last_name}, "info": None}

    # serialize info fields
    info_data = {
        "id": info.id,
        "user_id": info.user_id,
        "first_name": info.first_name,
        "last_name": info.last_name,
        "phone": info.phone,
        "date_of_birth": info.date_of_birth,
        "age": info.age,
        "gender": info.gender,
        "address": info.address,
        "height_cm": info.height_cm,
        "weight_kg": info.weight_kg,
        "medical_history": info.medical_history,
        "emergency_contact": info.emergency_contact,
        "autres_maladies": info.autres_maladies,
        "details_autres_maladies": info.details_autres_maladies,
        "tremblements": info.tremblements,
        "rigidite": info.rigidite,
        "bradykinesie": info.bradykinesie,
        "difficulte_marche": info.difficulte_marche,
        "instabilite": info.instabilite,
        "expression_faciale_reduite": info.expression_faciale_reduite,
        "micrographie": info.micrographie,
        "fatigue": info.fatigue,
        "troubles_sommeil": info.troubles_sommeil,
        "troubles_cognitifs": info.troubles_cognitifs,
        "depression_anxiete": info.depression_anxiete,
        "perte_odorat": info.perte_odorat,
        "constipation": info.constipation,
        "problemes_urinaires": info.problemes_urinaires,
        "douleurs": info.douleurs,
        "observations": info.observations,
        "created_at": info.created_at,
        "updated_at": info.updated_at,
    }

    return {"patient": {"id": user.id, "first_name": user.first_name, "last_name": user.last_name}, "info": info_data}


@app.post("/neurologist/case/{case_id}/report")
def submit_case_report(
    case_id: str,
    report_data: schemas.CaseReport,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Submit neurologist report"""
    case = db.query(models.MedicalCase).filter(models.MedicalCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    case.neurologist_id = current_user.id
    # Build a combined free-text report from structured fields for backward compatibility
    try:
        parts = []
        if getattr(report_data, 'clinical_summary', None):
            parts.append(f"Résumé clinique:\n{report_data.clinical_summary}")
        if getattr(report_data, 'exam_findings', None):
            parts.append(f"Examen clinique:\n{report_data.exam_findings}")
        if getattr(report_data, 'updrs_score', None):
            parts.append(f"Score UPDRS:\n{report_data.updrs_score}")
        if getattr(report_data, 'diagnosis', None):
            parts.append(f"Conclusion / Diagnostic:\n{report_data.diagnosis}")
        if getattr(report_data, 'complementary_exams', None):
            parts.append(f"Examens complémentaires:\n{report_data.complementary_exams}")
        if getattr(report_data, 'recommendations', None):
            parts.append(f"Recommandations:\n{report_data.recommendations}")
        if getattr(report_data, 'follow_up_plan', None):
            parts.append(f"Plan de suivi:\n{report_data.follow_up_plan}")
        if getattr(report_data, 'additional_notes', None):
            parts.append(f"Notes complémentaires:\n{report_data.additional_notes}")

        # If the client also sent a legacy combined text under 'neurologist_report' in the JSON
        # it will have been ignored by Pydantic; try to retrieve from the raw body dict if present.
        # But report_data.dict() contains the structured fields we care about.
        combined_report = "\n\n".join(parts).strip() if parts else None
    except Exception:
        combined_report = None

    case.neurologist_report = combined_report
    case.status = "completed"
    case.updated_at = datetime.utcnow()

    # Generate structured PDF report and store path
    try:
        # Prefer the new report generator using our SQLAlchemy models
        from report_generator import generate_case_report_pdf

        # Build a dict of structured fields from request body if present
        report_fields = report_data.dict()

        # generate and get file path (we pass the current DB session and structured fields)
        generated_path = generate_case_report_pdf(case.id, db=db, report_fields=report_fields)
        # generated_path is an absolute file path under backend/uploads/reports
        # expose it via the static /uploads route
        filename = os.path.basename(generated_path)
        case.report_pdf = f"/uploads/reports/{filename}"
    except Exception as e:
        print('Failed to generate PDF report:', e)

    db.commit()
    return {"message": "Report submitted successfully", "report_pdf": case.report_pdf}





# ============= ADMIN ROUTES =============

@app.get("/admin/users")
def get_all_users(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Get all users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = db.query(models.User).all()
    return [{
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "created_at": user.created_at,
    } for user in users]


@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Delete a user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


# Health check
@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/auth/me")
def read_current_user(
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return basic information about the current authenticated user"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
    }
@app.post("/chat")
def chat_endpoint(payload: dict):
    """Simple wrapper endpoint to query the local chatbot service.
    Expects JSON: { "question": "...", "patient_id": "optional" }
    """
    if chatbot_service is None:
        raise HTTPException(status_code=500, detail="Chatbot service not available on server")

    question = payload.get('question') or payload.get('q') or payload.get('query')
    if not question:
        raise HTTPException(status_code=400, detail="Missing 'question' in request body")

    try:
        # Ensure FAISS index is built
        if getattr(chatbot_service, 'faiss_index', None) is None:
            chatbot_service.build_faiss_index()

        # Optionally use patient-specific context in the future
        relevant = chatbot_service.search_relevant_chunks(question, top_k=5)
        response = chatbot_service.generate_chatbot_response(question, relevant)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Compatibility endpoints expected by the React UI (matches chatbot/templates/index.html)
@app.get("/api/patients")
def api_get_patients():
    """Return list of patients (lightweight) without auth for the UI. Uses chatbot service loader."""
    if chatbot_service is None:
        raise HTTPException(status_code=500, detail="Chatbot service not available")
    try:
        patients = chatbot_service.load_all_patients() or []
        # Map to lightweight shape expected by frontend
        out = [{ 'id': p.get('id'), 'name': f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip(), **p } for p in patients]
        return { 'patients': out }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
def api_get_stats():
    if chatbot_service is None:
        raise HTTPException(status_code=500, detail="Chatbot service not available")
    try:
        stats = chatbot_service.get_patient_stats() or {}
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/chat/field')
def api_chat_field(payload: dict):
    """Handle short field-like questions (name, age, simple fields).
    Expects { case_id: <id|null>, message: <string> }.
    """
    if chatbot_service is None:
        raise HTTPException(status_code=500, detail="Chatbot service not available")

    case_id = payload.get('case_id') or payload.get('patient_id') or None
    message = payload.get('message') or payload.get('q') or payload.get('query')
    if not message:
        raise HTTPException(status_code=400, detail="Missing 'message' in body")

    try:
        qnorm = str(message).lower()

        # If no explicit case_id provided, attempt to detect a patient by name inside the message
        if not case_id:
            try:
                patients = chatbot_service.load_all_patients() or []
                for p in patients:
                    fn = str(p.get('first_name') or '').lower()
                    ln = str(p.get('last_name') or '').lower()
                    full = f"{fn} {ln}".strip()
                    if (fn and fn in qnorm) or (ln and ln in qnorm) or (full and full in qnorm):
                        case_id = p.get('id')
                        break
            except Exception:
                case_id = None

        # Very simple heuristics: name/age queries
        if any(k in qnorm for k in ['nom', 'prénom', 'prenom', 'comment s appelle', "s'appelle", 'quel est son nom', 'nom du patient']):
            info = chatbot_service.get_patient_user_info(patient_id=case_id)
            if not info:
                return { 'type': 'not_field', 'message': 'Aucune information patient disponible' }
            fields = { 'first_name': info.get('first_name'), 'last_name': info.get('last_name') }
            return { 'type': 'fields', 'fields': fields }

        if any(k in qnorm for k in ['age', 'quel age', 'quel est son age', "quel âge"]):
            info = chatbot_service.get_patient_user_info(patient_id=case_id)
            if not info:
                return { 'type': 'not_field', 'message': 'Aucune information patient disponible' }
            fields = { 'age': info.get('age'), 'date_of_birth': info.get('date_of_birth') }
            return { 'type': 'fields', 'fields': fields }

        # Otherwise, try to run a short generation on the matching chunks
        try:
            if getattr(chatbot_service, 'faiss_index', None) is None:
                chatbot_service.build_faiss_index()
            relevant = chatbot_service.search_relevant_chunks(message, top_k=5)
            if not relevant:
                return { 'type': 'not_field', 'message': 'Aucune donnée trouvée' }
            # Ask the model to produce a concise answer for the field query
            resp = chatbot_service.generate_chatbot_response(message, relevant)
            return { 'type': 'not_field', 'message': resp }
        except Exception as e:
            return { 'type': 'not_field', 'error': str(e) }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/patients/raw/{patient_id}')
def api_get_patient_raw(patient_id: str):
    """Debug endpoint: return raw patient record as read from chatbot service DB loader."""
    if chatbot_service is None:
        raise HTTPException(status_code=500, detail="Chatbot service not available")
    try:
        patients = chatbot_service.load_all_patients() or []
        for p in patients:
            # match by id (could be int or str in DB)
            if str(p.get('id')) == str(patient_id):
                return { 'patient': p }
        raise HTTPException(status_code=404, detail='Patient not found')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/patients/details')
def api_get_patients_details():
    """Return detailed patient records (used by the React UI for computing averages etc).
    Provides a `computed_age` field computed from date_of_birth when possible.
    """
    if chatbot_service is None:
        raise HTTPException(status_code=500, detail="Chatbot service not available")
    try:
        patients = chatbot_service.load_all_patients() or []
        out = []
        for p in patients:
            dob = p.get('date_of_birth') or p.get('dob')
            computed = None
            try:
                if hasattr(chatbot_service, 'compute_age_from_dob'):
                    computed = chatbot_service.compute_age_from_dob(dob)
                else:
                    # best-effort fallback: try parse YYYY-MM-DD
                    if dob:
                        try:
                            from datetime import datetime
                            if isinstance(dob, str):
                                dt = datetime.fromisoformat(dob)
                                today = datetime.today()
                                computed = today.year - dt.year - ((today.month, today.day) < (dt.month, dt.day))
                        except Exception:
                            computed = None
            except Exception:
                computed = None

            # return a copy with computed_age added
            copy = dict(p)
            copy['computed_age'] = computed
            out.append(copy)

        return { 'patients': out }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat/health")
def chat_health():
    """Health check for chatbot availability"""
    if chatbot_service is None:
        return {"ok": False, "message": "chatbot_service not loaded"}
    # ensure index built
    try:
        if getattr(chatbot_service, 'faiss_index', None) is None:
            chatbot_service.build_faiss_index()
        return {"ok": True, "message": "chatbot ready", "chunks": len(getattr(chatbot_service, 'chunks_data', []) or [])}
    except Exception as e:
        return {"ok": False, "message": f"error building index: {e}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
