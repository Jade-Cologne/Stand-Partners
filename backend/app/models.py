from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date, DateTime,
    Text, ForeignKey, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class OrchestraType(str, enum.Enum):
    professional = "professional"
    regional = "regional"
    community = "community"
    youth = "youth"
    other = "other"


class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Orchestra(Base):
    __tablename__ = "orchestras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    type = Column(SAEnum(OrchestraType), nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=True)   # nullable for non-US
    country = Column(String, nullable=False, default="US")
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    website = Column(String, nullable=True)
    audition_page = Column(String, nullable=True)  # direct URL to auditions/employment page
    personnel_manager_name = Column(String, nullable=True)
    personnel_manager_email = Column(String, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_crawled_at = Column(DateTime, nullable=True)
    crawl_enabled = Column(Boolean, default=True, nullable=False)
    crawl_error = Column(Text, nullable=True)  # last error message if crawl failed
    source = Column(String, nullable=True)  # seed | directory | claude | manual
    notes = Column(Text, nullable=True)

    auditions = relationship("Audition", back_populates="orchestra", cascade="all, delete-orphan")
    sub_list_info = relationship("SubListInfo", back_populates="orchestra", uselist=False, cascade="all, delete-orphan")


class Audition(Base):
    __tablename__ = "auditions"

    id = Column(Integer, primary_key=True, index=True)
    orchestra_id = Column(Integer, ForeignKey("orchestras.id"), nullable=False)
    position = Column(String, nullable=False)     # e.g. "Principal Oboe"
    instrument = Column(String, nullable=False)   # e.g. "oboe"
    section = Column(String, nullable=True)       # e.g. "woodwinds"
    is_section_audition = Column(Boolean, default=False)
    is_per_service = Column(Boolean, default=False)
    deadline = Column(Date, nullable=True)
    audition_date = Column(Date, nullable=True)
    audition_location = Column(String, nullable=True)
    raw_excerpt_text = Column(Text, nullable=True)  # verbatim from the website
    source_url = Column(String, nullable=True)
    scraped_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    orchestra = relationship("Orchestra", back_populates="auditions")
    excerpt_links = relationship("AuditionExcerpt", back_populates="audition", cascade="all, delete-orphan")
    excerpts = relationship("Excerpt", secondary="audition_excerpts", viewonly=True)


class SubListInfo(Base):
    __tablename__ = "sub_list_info"

    id = Column(Integer, primary_key=True, index=True)
    orchestra_id = Column(Integer, ForeignKey("orchestras.id"), nullable=False, unique=True)
    has_sublist = Column(Boolean, nullable=True)         # None = no mention
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    has_formal_submission = Column(Boolean, default=False)
    submission_url = Column(String, nullable=True)
    submission_details = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    orchestra = relationship("Orchestra", back_populates="sub_list_info")


class Excerpt(Base):
    __tablename__ = "excerpts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)       # e.g. "Don Juan"
    composer = Column(String, nullable=False)    # e.g. "Strauss"
    work = Column(String, nullable=False)        # full work title
    movement = Column(String, nullable=True)     # e.g. "opening" or "mm. 1-36"
    instrument = Column(String, nullable=False)
    pdf_path = Column(String, nullable=True)     # relative path under uploads/excerpts/
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    audition_links = relationship("AuditionExcerpt", back_populates="excerpt", cascade="all, delete-orphan")
    auditions = relationship("Audition", secondary="audition_excerpts", viewonly=True)


class AuditionExcerpt(Base):
    __tablename__ = "audition_excerpts"

    audition_id = Column(Integer, ForeignKey("auditions.id"), primary_key=True)
    excerpt_id = Column(Integer, ForeignKey("excerpts.id"), primary_key=True)

    audition = relationship("Audition", back_populates="excerpt_links")
    excerpt = relationship("Excerpt", back_populates="audition_links")


class EnsembleRequest(Base):
    __tablename__ = "ensemble_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(SAEnum(OrchestraType), nullable=True)
    website = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(SAEnum(RequestStatus), default=RequestStatus.pending, nullable=False)
