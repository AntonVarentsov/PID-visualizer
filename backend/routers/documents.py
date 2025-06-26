from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend import schemas
from backend.services import DocumentService
from backend.services.dependencies import get_db

router = APIRouter()

@router.post("/documents/", response_model=schemas.Document)
def create_document(document: schemas.DocumentCreate, db: Session = Depends(get_db)):
    service = DocumentService(db)
    return service.create_document(document)

@router.get("/doc/{doc_id}", response_model=schemas.Document)
def read_document(doc_id: int, db: Session = Depends(get_db)):
    service = DocumentService(db)
    return service.get_document(doc_id)

@router.post("/documents/{doc_id}/parse-json")
def parse_json_for_document(doc_id: int, data: dict, db: Session = Depends(get_db)):
    service = DocumentService(db)
    return service.parse_json(doc_id, data)

@router.get("/")
def read_root():
    return {"Hello": "World"}
