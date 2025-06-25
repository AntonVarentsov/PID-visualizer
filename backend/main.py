from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import json

from backend import crud, models, schemas
from backend.database import SessionLocal, engine

# This will now check if the tables exist before trying to create them.
models.Base.metadata.create_all(bind=engine, checkfirst=True)

app = FastAPI()

# Allow CORS for frontend development
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/documents/", response_model=schemas.Document)
def create_document(document: schemas.DocumentCreate, db: Session = Depends(get_db)):
    return crud.create_document(db=db, document=document)

@app.get("/doc/{doc_id}", response_model=schemas.Document)
def read_document(doc_id: int, db: Session = Depends(get_db)):
    db_document = crud.get_document(db, document_id=doc_id)
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return db_document

@app.patch("/line/{line_id}", response_model=schemas.LineNumber)
def update_line(line_id: int, text: str, status: str, db: Session = Depends(get_db)):
    db_line_number = crud.update_line_number(db, line_number_id=line_id, text=text, status=status)
    if db_line_number is None:
        raise HTTPException(status_code=404, detail="LineNumber not found")
    return db_line_number

@app.post("/documents/{doc_id}/parse-json")
def parse_json_for_document(doc_id: int, data: dict, db: Session = Depends(get_db)):
    db_document = crud.get_document(db, document_id=doc_id)
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # This endpoint now populates the OcrResult table
        for ocr_data in data.get('line_numbers', []): # Assuming input key from OCR is still 'line_numbers'
            ocr_result_create = schemas.OcrResultCreate(
                page=ocr_data.get('page', 1), # Default to page 1 if not provided
                text=ocr_data['text'],
                x_coord=ocr_data['x_coord'],
                y_coord=ocr_data['y_coord'],
                width=ocr_data['width'],
                height=ocr_data['height']
            )
            crud.create_ocr_result(db=db, ocr_result=ocr_result_create, document_id=doc_id)

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing key in JSON data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing JSON data: {str(e)}")

    return {"message": "JSON processed and OCR results created successfully"}

@app.get("/")
def read_root():
    return {"Hello": "World"} 