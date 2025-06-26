from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.services import OcrService
from backend.services.dependencies import get_db

router = APIRouter()

@router.post("/documents/{doc_id}/parse-json")
def parse_json_for_document(doc_id: int, data: dict, db: Session = Depends(get_db)):
    service = OcrService(db)
    return service.parse_json(doc_id, data)
