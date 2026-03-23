from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter()


def _active_audition_count(orchestra: models.Orchestra) -> int:
    return sum(1 for a in orchestra.auditions if a.active)


@router.get("/", response_model=List[schemas.OrchestraOut])
def list_orchestras(
    type: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Orchestra)
    if type:
        q = q.filter(models.Orchestra.type == type)
    if state:
        q = q.filter(models.Orchestra.state == state)
    if country:
        q = q.filter(models.Orchestra.country == country)
    orchestras = q.order_by(models.Orchestra.name).all()
    result = []
    for o in orchestras:
        out = schemas.OrchestraOut.model_validate(o)
        out.active_audition_count = _active_audition_count(o)
        result.append(out)
    return result


@router.get("/map", response_model=List[schemas.OrchestraMapPin])
def map_pins(db: Session = Depends(get_db)):
    """Lightweight endpoint for the map — only returns fields needed for pins."""
    orchestras = db.query(models.Orchestra).filter(
        models.Orchestra.lat.isnot(None),
        models.Orchestra.lng.isnot(None),
    ).all()
    result = []
    for o in orchestras:
        pin = schemas.OrchestraMapPin.model_validate(o)
        pin.active_audition_count = _active_audition_count(o)
        result.append(pin)
    return result


@router.get("/{orchestra_id}", response_model=schemas.OrchestraDetail)
def get_orchestra(orchestra_id: int, db: Session = Depends(get_db)):
    o = db.query(models.Orchestra).filter(models.Orchestra.id == orchestra_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Orchestra not found")
    detail = schemas.OrchestraDetail.model_validate(o)
    detail.active_audition_count = _active_audition_count(o)
    return detail


@router.get("/{orchestra_id}/auditions", response_model=List[schemas.AuditionOut])
def get_orchestra_auditions(
    orchestra_id: int,
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
):
    o = db.query(models.Orchestra).filter(models.Orchestra.id == orchestra_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Orchestra not found")
    auditions = [a for a in o.auditions if (not active_only or a.active)]
    result = []
    for a in auditions:
        out = schemas.AuditionOut.model_validate(a)
        out.excerpt_count = len(a.excerpts)
        result.append(out)
    return result
