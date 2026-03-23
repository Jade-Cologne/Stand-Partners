import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter()

ADMIN_KEY = os.getenv("ADMIN_API_KEY", "")


@router.get("/", response_model=List[schemas.ExcerptOut])
def list_excerpts(
    instrument: Optional[str] = Query(None),
    composer: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Search title, composer, or work"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Excerpt)
    if instrument:
        query = query.filter(models.Excerpt.instrument.ilike(f"%{instrument}%"))
    if composer:
        query = query.filter(models.Excerpt.composer.ilike(f"%{composer}%"))
    if q:
        query = query.filter(
            models.Excerpt.title.ilike(f"%{q}%")
            | models.Excerpt.composer.ilike(f"%{q}%")
            | models.Excerpt.work.ilike(f"%{q}%")
        )
    return query.order_by(models.Excerpt.composer, models.Excerpt.title).all()


@router.get("/{excerpt_id}", response_model=schemas.ExcerptOut)
def get_excerpt(excerpt_id: int, db: Session = Depends(get_db)):
    e = db.query(models.Excerpt).filter(models.Excerpt.id == excerpt_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Excerpt not found")
    return e


@router.post("/", response_model=schemas.ExcerptOut, status_code=201)
async def upload_excerpt(
    title: str,
    composer: str,
    work: str,
    instrument: str,
    movement: Optional[str] = None,
    notes: Optional[str] = None,
    file: Optional[UploadFile] = File(None),
    x_admin_key: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if ADMIN_KEY and x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Not authorized")

    pdf_path = None
    if file:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")
        safe_name = f"{composer.replace(' ', '_')}_{title.replace(' ', '_')}.pdf"
        save_path = os.path.join("uploads", "excerpts", safe_name)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        content = await file.read()
        with open(save_path, "wb") as f:
            f.write(content)
        pdf_path = save_path

    excerpt = models.Excerpt(
        title=title,
        composer=composer,
        work=work,
        instrument=instrument,
        movement=movement,
        notes=notes,
        pdf_path=pdf_path,
    )
    db.add(excerpt)
    db.commit()
    db.refresh(excerpt)
    return excerpt
