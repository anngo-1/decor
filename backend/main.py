from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uuid

import models
import schemas
import database

app = FastAPI(title="Decor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables (for local dev, usually use Alembic for prod)
models.Base.metadata.create_all(bind=database.engine)


@app.post("/users", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.id == user.id).first()
    if db_user:
        return db_user
    db_user = models.User(id=user.id)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/spaces", response_model=schemas.Space)
def create_space(
    space: schemas.SpaceCreate, user_id: str, db: Session = Depends(database.get_db)
):
    db_space = models.Space(id=str(uuid.uuid4()), user_id=user_id, **space.model_dump())
    db.add(db_space)
    db.commit()
    db.refresh(db_space)
    return db_space


@app.get("/spaces/community", response_model=List[schemas.Space])
def get_community_spaces(db: Session = Depends(database.get_db)):
    return (
        db.query(models.Space)
        .filter(models.Space.is_published == True)
        .order_by(models.Space.created_at.desc())
        .all()
    )


@app.get("/spaces/user/{user_id}", response_model=List[schemas.Space])
def get_user_spaces(user_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.Space).filter(models.Space.user_id == user_id).all()


@app.get("/spaces/{space_id}", response_model=schemas.Space)
def get_space(space_id: str, db: Session = Depends(database.get_db)):
    db_space: models.Space | None = (
        db.query(models.Space).filter(models.Space.id == space_id).first()
    )
    if db_space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return db_space


@app.get("/spaces/{space_id}/layout", response_model=schemas.SpaceLayout)
def get_space_layout(space_id: str, db: Session = Depends(database.get_db)):
    db_space = (
        db.query(models.Space.id, models.Space.layout_data)
        .filter(models.Space.id == space_id)
        .first()
    )
    if db_space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return db_space


@app.put("/spaces/{space_id}", response_model=schemas.Space)
def update_space(
    space_id: str,
    user_id: str,
    space_update: schemas.SpaceUpdate,
    db: Session = Depends(database.get_db),
):
    db_space: models.Space | None = (
        db.query(models.Space).filter(models.Space.id == space_id).first()
    )
    if db_space is None:
        raise HTTPException(status_code=404, detail="Space not found")

    if getattr(db_space, "user_id") != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this space"
        )

    update_data = space_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_space, key, value)

    db.commit()
    db.refresh(db_space)
    return db_space
