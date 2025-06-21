from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- LineNumber Schemas ---
class LineNumberBase(BaseModel):
    text: str | None = None
    page: int
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
        from_attributes = True

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
        from_attributes = True 