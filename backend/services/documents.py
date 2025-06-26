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

