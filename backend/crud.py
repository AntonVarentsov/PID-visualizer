from sqlalchemy.orm import Session, joinedload
import models, schemas

# --- Document CRUD ---

def get_document(db: Session, document_id: int):
    return db.query(models.Document).options(joinedload(models.Document.line_numbers)).filter(models.Document.id == document_id).first()

def get_documents(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Document).offset(skip).limit(limit).all()

def create_document(db: Session, document: schemas.DocumentCreate):
    db_document = models.Document(
        file_name=document.file_name,
        pages=document.pages
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

def delete_line_numbers_by_document(db: Session, document_id: int):
    """Deletes all LineNumber records associated with a given document_id."""
    db.query(models.LineNumber).filter(models.LineNumber.document_id == document_id).delete()
    db.commit()

# --- LineNumber CRUD ---

def create_line_number(db: Session, line_number: schemas.LineNumberCreate, document_id: int):
    db_line_number = models.LineNumber(
        document_id=document_id,
        page=line_number.page,
        text=line_number.text,
        x_coord=line_number.x_coord,
        y_coord=line_number.y_coord,
        width=line_number.width,
        height=line_number.height,
        status='pending'
    )
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