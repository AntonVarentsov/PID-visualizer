from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend import crud

class LineService:
    def __init__(self, db: Session):
        self.db = db

    def update_line(self, line_id: int, text: str, status: str):
        line = crud.update_line_number(self.db, line_id, text, status)
        if line is None:
            raise HTTPException(status_code=404, detail="LineNumber not found")
        return line
