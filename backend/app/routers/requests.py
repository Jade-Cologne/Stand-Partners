from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter()


@router.post("/", response_model=schemas.EnsembleRequestOut, status_code=201)
def submit_request(payload: schemas.EnsembleRequestCreate, db: Session = Depends(get_db)):
    req = models.EnsembleRequest(**payload.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    return req
