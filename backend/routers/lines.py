from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend import schemas
from backend.services import LineService
from backend.services.dependencies import get_db

router = APIRouter()

@router.patch("/line/{line_id}", response_model=schemas.LineNumber)
def update_line(line_id: int, text: str, status: str, db: Session = Depends(get_db)):
    service = LineService(db)
    return service.update_line(line_id, text, status)
