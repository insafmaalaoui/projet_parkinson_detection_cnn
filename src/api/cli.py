import typer
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str):
    return pwd_context.hash(password)

app = typer.Typer()

def main(
    email: str = typer.Option(..., prompt=True),
    password: str = typer.Option(..., prompt=True, hide_input=True),
    first_name: str = typer.Option("Admin"),
    last_name: str = typer.Option("User")
):
    db: Session = SessionLocal()
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        typer.echo("⚠️ Superuser already exists.")
        return

    hashed_password = get_password_hash(password)
    superuser = User(
        email=email,
        hashed_password=hashed_password,
        role="admin",
        first_name=first_name,
        last_name=last_name,
        created_at=datetime.utcnow()
    )
    db.add(superuser)
    db.commit()
    db.refresh(superuser)
    typer.echo(f"✅ Superuser {email} created successfully!")

if __name__ == "__main__":
    app.command()(main)
    app()  # lance Typer
