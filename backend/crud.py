from sqlalchemy.orm import Session
import models, schemas

# --- Document CRUD ---

def get_document(db: Session, document_id: int):
    return db.query(models.Document).filter(models.Document.id == document_id).first()

def get_documents(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Document).offset(skip).limit(limit).all()

def create_document(db: Session, document: schemas.DocumentCreate):
    db_document = models.Document(**document.model_dump())
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

# --- LineNumber CRUD ---

def create_line_number(db: Session, line_number: schemas.LineNumberCreate, document_id: int):
    db_line_number = models.LineNumber(**line_number.model_dump(), document_id=document_id)
    db.add(db_line_number)
    db.commit()
    db.refresh(db_line_number)
    return db_line_number

def update_line_number(db: Session, line_number_id: int, text: str, status: str):
    db_line_number = db.query(models.LineNumber).filter(models.LineNumber.id == line_number_id).first()
    if db_line_number:
        db_line_number.text = text
        db_line_number.status = status
        db.commit()
        db.refresh(db_line_number)
    return db_line_number 