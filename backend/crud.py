from sqlalchemy.orm import Session, joinedload
from backend import models
from backend import schemas

# --- Document CRUD ---

def get_document(db: Session, document_id: int):
    return db.query(models.Document).options(
        joinedload(models.Document.line_numbers),
        joinedload(models.Document.ocr_results)
    ).filter(models.Document.id == document_id).first()

def get_document_by_filename(db: Session, filename: str):
    return db.query(models.Document).filter(models.Document.file_name == filename).first()

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

def get_ocr_results(db: Session, document_id: int):
    return db.query(models.OcrResult).filter(models.OcrResult.document_id == document_id).all()

def get_ocr_result_by_text(db: Session, text: str, document_id: int):
    """Возвращает первый найденный результат OCR по точному совпадению текста в рамках документа."""
    return db.query(models.OcrResult).filter(
        models.OcrResult.document_id == document_id,
        models.OcrResult.text == text
    ).first()

def delete_ocr_results_by_document(db: Session, document_id: int):
    """Deletes all OcrResult records associated with a given document_id."""
    db.query(models.OcrResult).filter(models.OcrResult.document_id == document_id).delete()
    db.commit()

def get_all_ocr_results_for_document(db: Session, document_id: int):
    """
    Retrieves all OCR results for a given document ID.
    """
    return db.query(models.OcrResult).filter(models.OcrResult.document_id == document_id).all()

# --- OcrResult CRUD ---

def create_ocr_result(db: Session, ocr_result: schemas.OcrResultCreate, document_id: int):
    db_ocr_result = models.OcrResult(
        document_id=document_id,
        page=ocr_result.page,
        text=ocr_result.text,
        x_coord=ocr_result.x_coord,
        y_coord=ocr_result.y_coord,
        width=ocr_result.width,
        height=ocr_result.height,
        status='auto'
    )
    db.add(db_ocr_result)
    db.commit()
    db.refresh(db_ocr_result)
    return db_ocr_result

def update_ocr_result(db: Session, ocr_result_id: int, text: str, status: str):
    db_ocr_result = db.query(models.OcrResult).filter(models.OcrResult.id == ocr_result_id).first()
    if db_ocr_result:
        db_ocr_result.text = text
        db_ocr_result.status = status
        db.commit()
        db.refresh(db_ocr_result)
    return db_ocr_result

# --- LineNumber CRUD ---

def create_line_number(db: Session, line_number: schemas.LineNumberCreate, document_id: int):
    db_line_number = models.LineNumber(
        document_id=document_id,
        text=line_number.text,
        x_coord=line_number.x_coord,
        y_coord=line_number.y_coord,
        width=line_number.width,
        height=line_number.height,
        page=line_number.page,
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

def delete_line_numbers_by_document(db: Session, document_id: int):
    db.query(models.LineNumber).filter(models.LineNumber.document_id == document_id).delete()
    db.commit() 