from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # patient, neurologist, admin
    first_name = Column(String)
    last_name = Column(String)
    speciality = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    cases = relationship("MedicalCase", foreign_keys="MedicalCase.patient_id", back_populates="patient")
    analyzed_cases = relationship("MedicalCase", foreign_keys="MedicalCase.neurologist_id", back_populates="neurologist")
    info = relationship("InfoPatient", back_populates="user", uselist=False)


class MedicalCase(Base):
    __tablename__ = "medical_cases"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("users.id"))
    neurologist_id = Column(String, ForeignKey("users.id"), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, analyzed, completed
    # legacy string field (may contain values like 'Malade' or older 'Malade:0.9754')
    cnn_prediction = Column(String, nullable=True)
    # numeric prediction and confidence (added for better typing and sorting)
    cnn_prediction_num = Column(Float, nullable=True)
    cnn_confidence = Column(Float, nullable=True)
    # path to generated PDF report by neurologist
    report_pdf = Column(String, nullable=True)
    neurologist_report = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    patient = relationship("User", foreign_keys=[patient_id], back_populates="cases")
    neurologist = relationship("User", foreign_keys=[neurologist_id], back_populates="analyzed_cases")
    images = relationship("MRIImage", back_populates="case", cascade="all, delete-orphan")


class MRIImage(Base):
    __tablename__ = "mri_images"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("medical_cases.id"))
    filename = Column(String)
    file_path = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("MedicalCase", back_populates="images")


class InfoPatient(Base):
    __tablename__ = "info_patients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True)

    # Informations personnelles
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    # Contact / basic info
    phone = Column(String, nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    address = Column(String, nullable=True)

    # Physical measurements
    height_cm = Column(Integer, nullable=True)
    weight_kg = Column(Integer, nullable=True)

    # Antécédents médicaux
    medical_history = Column(Text, nullable=True)
    emergency_contact = Column(String, nullable=True)
    autres_maladies = Column(Boolean, default=False)
    details_autres_maladies = Column(Text, nullable=True)

    # Symptômes moteurs
    tremblements = Column(Boolean, default=False)
    rigidite = Column(Boolean, default=False)
    bradykinesie = Column(Boolean, default=False)
    difficulte_marche = Column(Boolean, default=False)
    instabilite = Column(Boolean, default=False)
    expression_faciale_reduite = Column(Boolean, default=False)
    micrographie = Column(Boolean, default=False)

    # Symptômes non moteurs
    fatigue = Column(Boolean, default=False)
    troubles_sommeil = Column(Boolean, default=False)
    troubles_cognitifs = Column(Boolean, default=False)
    depression_anxiete = Column(Boolean, default=False)
    perte_odorat = Column(Boolean, default=False)
    constipation = Column(Boolean, default=False)
    problemes_urinaires = Column(Boolean, default=False)
    douleurs = Column(Boolean, default=False)

    # Observations supplémentaires
    observations = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="info")
