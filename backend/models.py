from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend import database

Base = database.Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(Text)
    pages = Column(Integer)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    
    line_numbers = relationship("LineNumber", back_populates="document")
    ocr_results = relationship("OcrResult", back_populates="document")

class OcrResult(Base):
    __tablename__ = "ocr_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    page = Column(Integer)
    text = Column(Text, index=True)
    x_coord = Column(Float)
    y_coord = Column(Float)
    width = Column(Float)
    height = Column(Float)
    status = Column(String, default="auto")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    document = relationship("Document", back_populates="ocr_results")

class LineNumber(Base):
    __tablename__ = "line_numbers"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    page = Column(Integer)
    text = Column(Text, index=True)
    x_coord = Column(Float)
    y_coord = Column(Float)
    width = Column(Float)
    height = Column(Float)
    status = Column(String, default="pending")
    
    document = relationship("Document", back_populates="line_numbers") 