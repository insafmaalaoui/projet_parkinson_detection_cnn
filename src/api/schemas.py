from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: str  # patient, neurologist, admin
    first_name: str
    last_name: str
    speciality: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str

class CaseReport(BaseModel):
    # Structured report fields
    clinical_summary: Optional[str] = None
    exam_findings: Optional[str] = None
    updrs_score: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendations: Optional[str] = None
    complementary_exams: Optional[str] = None
    follow_up_plan: Optional[str] = None
    additional_notes: Optional[str] = None
    # legacy / numeric confirmation
    confirmed_prediction: Optional[float] = None

class ChatMessage(BaseModel):
    case_id: str
    message: str

class MedicalCaseResponse(BaseModel):
    id: str
    patient_id: str
    status: str
    cnn_prediction: Optional[float]
    neurologist_report: Optional[str]
    created_at: datetime


class InfoPatientBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[int] = None
    medical_history: Optional[str] = None
    emergency_contact: Optional[str] = None
    # Extended fields
    autres_maladies: Optional[bool] = False
    details_autres_maladies: Optional[str] = None
    tremblements: Optional[bool] = False
    rigidite: Optional[bool] = False
    bradykinesie: Optional[bool] = False
    difficulte_marche: Optional[bool] = False
    instabilite: Optional[bool] = False
    expression_faciale_reduite: Optional[bool] = False
    micrographie: Optional[bool] = False
    fatigue: Optional[bool] = False
    troubles_sommeil: Optional[bool] = False
    troubles_cognitifs: Optional[bool] = False
    depression_anxiete: Optional[bool] = False
    perte_odorat: Optional[bool] = False
    constipation: Optional[bool] = False
    problemes_urinaires: Optional[bool] = False
    douleurs: Optional[bool] = False
    observations: Optional[str] = None


class InfoPatientCreate(InfoPatientBase):
    pass


class InfoPatientOut(InfoPatientBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
