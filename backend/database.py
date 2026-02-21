from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # In production, we should probably fail if DATABASE_URL is not set
    # For now, we'll default to sqlite for local dev but print a warning
    DATABASE_URL = "sqlite:///./decor.db"
    print("WARNING: DATABASE_URL not set, defaulting to local sqlite.")

# For SQLite, we need to allow multiple threads to access the same connection
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
