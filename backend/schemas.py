from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- OcrResult Schemas (previously LineNumber) ---
class OcrResultBase(BaseModel):
    text: Optional[str] = None
    page: int
    x_coord: float
    y_coord: float
    width: float
    height: float
    status: str = "auto"

class OcrResultCreate(OcrResultBase):
    pass

class OcrResult(OcrResultBase):
    id: int
    document_id: int
    updated_at: datetime

    class Config:
        from_attributes = True

# --- LineNumber Schemas (New) ---
class LineNumberBase(BaseModel):
    text: Optional[str] = None
    x_coord: float
    y_coord: float
    width: float
    height: float
    status: str = "pending"

class LineNumberCreate(LineNumberBase):
    pass

class LineNumber(LineNumberBase):
    id: int
    document_id: int

    class Config:
        from_attributes = True

# --- Document Schemas ---
class DocumentBase(BaseModel):
    file_name: str
    pages: Optional[int] = None
    original_width: Optional[int] = None
    original_height: Optional[int] = None

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: int
    imported_at: datetime
    line_numbers: List[LineNumber] = []
    ocr_results: List[OcrResult] = []

    class Config:
        from_attributes = True 