from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATABASE_PATH = BASE_DIR / "medidiagnose.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

print(f"[DB] Database file location: {DATABASE_PATH}")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    """Initialize database tables"""
    import models
    Base.metadata.create_all(bind=engine)
    print("[DB] Database tables created successfully!")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
