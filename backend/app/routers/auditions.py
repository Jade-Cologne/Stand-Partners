from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.AuditionOut])
def list_auditions(
    instrument: Optional[str] = Query(None),
    orchestra_type: Optional[str] = Query(None, alias="type"),
    active: bool = Query(True),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    q = db.query(models.Audition).join(models.Orchestra)
    if active:
        q = q.filter(models.Audition.active == True)
    if instrument:
        q = q.filter(models.Audition.instrument.ilike(f"%{instrument}%"))
    if orchestra_type:
        q = q.filter(models.Orchestra.type == orchestra_type)
    auditions = q.order_by(models.Audition.deadline.asc().nulls_last()).offset(offset).limit(limit).all()
    result = []
    for a in auditions:
        out = schemas.AuditionOut.model_validate(a)
        result.append(out)
    return result


@router.get("/{audition_id}", response_model=schemas.AuditionOut)
def get_audition(audition_id: int, db: Session = Depends(get_db)):
    a = db.query(models.Audition).filter(models.Audition.id == audition_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Audition not found")
    return schemas.AuditionOut.model_validate(a)
