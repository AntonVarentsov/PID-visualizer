from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend import crud, schemas

class DocumentService:
    def __init__(self, db: Session):
        self.db = db

    def create_document(self, document: schemas.DocumentCreate):
        return crud.create_document(self.db, document)

    def get_document(self, document_id: int):
        document = crud.get_document(self.db, document_id)
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found")
        return document

    def parse_json(self, doc_id: int, data: dict):
        self.get_document(doc_id)
        for ocr_data in data.get("line_numbers", []):
            ocr_result = schemas.OcrResultCreate(
                page=ocr_data.get("page", 1),
                text=ocr_data["text"],
                x_coord=ocr_data["x_coord"],
                y_coord=ocr_data["y_coord"],
                width=ocr_data["width"],
                height=ocr_data["height"],
            )
            crud.create_ocr_result(self.db, ocr_result, document_id=doc_id)
        return {"message": "JSON processed and OCR results created successfully"}
