from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr

from app.models import OrchestraType, RequestStatus


# --- Excerpt ---

class ExcerptBase(BaseModel):
    title: str
    composer: str
    work: str
    movement: Optional[str] = None
    instrument: str
    notes: Optional[str] = None

class ExcerptOut(ExcerptBase):
    id: int
    pdf_path: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ExcerptSummary(BaseModel):
    id: int
    title: str
    composer: str
    instrument: str
    pdf_path: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Sub List ---

class SubListInfoOut(BaseModel):
    id: int
    has_sublist: Optional[bool] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    has_formal_submission: bool = False
    submission_url: Optional[str] = None
    submission_details: Optional[str] = None
    notes: Optional[str] = None
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Audition ---

class AuditionBase(BaseModel):
    position: str
    instrument: str
    section: Optional[str] = None
    is_section_audition: bool = False
    is_per_service: bool = False
    deadline: Optional[date] = None
    audition_date: Optional[date] = None
    audition_location: Optional[str] = None
    raw_excerpt_text: Optional[str] = None
    source_url: Optional[str] = None

class AuditionOut(AuditionBase):
    id: int
    orchestra_id: int
    scraped_at: datetime
    active: bool
    excerpts: List[ExcerptSummary] = []

    model_config = {"from_attributes": True}

class AuditionSummary(BaseModel):
    id: int
    position: str
    instrument: str
    deadline: Optional[date] = None
    active: bool
    excerpt_count: int = 0

    model_config = {"from_attributes": True}


# --- Orchestra ---

class OrchestraBase(BaseModel):
    name: str
    type: OrchestraType
    city: str
    state: Optional[str] = None
    country: str = "US"
    lat: Optional[float] = None
    lng: Optional[float] = None
    website: Optional[str] = None
    audition_page: Optional[str] = None
    personnel_manager_name: Optional[str] = None
    personnel_manager_email: Optional[str] = None

class OrchestraOut(OrchestraBase):
    id: int
    added_at: datetime
    last_crawled_at: Optional[datetime] = None
    crawl_error: Optional[str] = None
    active_audition_count: int = 0
    sub_list_info: Optional[SubListInfoOut] = None

    model_config = {"from_attributes": True}

class OrchestraMapPin(BaseModel):
    id: int
    name: str
    type: OrchestraType
    city: str
    state: Optional[str] = None
    country: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    active_audition_count: int = 0

    model_config = {"from_attributes": True}

class OrchestraDetail(OrchestraOut):
    auditions: List[AuditionOut] = []

    model_config = {"from_attributes": True}


# --- Ensemble Request ---

class EnsembleRequestCreate(BaseModel):
    name: str
    type: Optional[OrchestraType] = None
    website: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: str
    notes: Optional[str] = None

class EnsembleRequestOut(EnsembleRequestCreate):
    id: int
    submitted_at: datetime
    status: RequestStatus

    model_config = {"from_attributes": True}
