from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from .database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(Text)
    pages = Column(Integer)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())

class LineNumber(Base):
    __tablename__ = "line_numbers"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    page = Column(Integer)
    text = Column(Text)
    bbox = Column(JSON)
    status = Column(String, default="auto")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()) 