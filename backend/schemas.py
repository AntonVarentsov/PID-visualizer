from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- LineNumber Schemas ---
class LineNumberBase(BaseModel):
    page: int
    text: str
    x_coord: float
    y_coord: float
    width: float
    height: float
    status: str = "auto"

class LineNumberCreate(LineNumberBase):
    pass

class LineNumber(LineNumberBase):
    id: int
    document_id: int
    updated_at: datetime

    class Config:
        orm_mode = True

# --- Document Schemas ---
class DocumentBase(BaseModel):
    file_name: str
    pages: int

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: int
    imported_at: datetime
    line_numbers: List[LineNumber] = []

    class Config:
        orm_mode = True 