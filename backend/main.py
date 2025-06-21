from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
import json

import crud
import models
import schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

@app.post("/documents/{doc_id}/process_json")
def process_json_for_document(doc_id: int, db: Session = Depends(get_db)):
    json_path = "output/test_pid.pdf_processed.json"
    piping_lines_path = "output/extracted_piping_lines.txt"

    db_document = crud.get_document(db, document_id=doc_id)
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        with open(piping_lines_path, 'r') as f:
            piping_line_types = {line.strip() for line in f}

        with open(json_path, 'r') as f:
            data = json.load(f)
            
            doc_width = data['pages'][0]['dimension']['width']
            doc_height = data['pages'][0]['dimension']['height']

            for entity in data.get('entities', []):
                if entity.get('type') in piping_line_types:
                    text = entity.get('mentionText')
                    page_number = entity.get('pageAnchor', {}).get('pageRefs', [{}])[0].get('page', 0)
                    
                    vertices = entity.get('pageAnchor', {}).get('pageRefs', [{}])[0].get('boundingPoly', {}).get('normalizedVertices', [])
                    if len(vertices) == 4:
                        x_coords = [v.get('x', 0) * doc_width for v in vertices]
                        y_coords = [v.get('y', 0) * doc_height for v in vertices]

                        x_min = min(x_coords)
                        y_min = min(y_coords)
                        width = max(x_coords) - x_min
                        height = max(y_coords) - y_min
                        
                        line_number_data = schemas.LineNumberCreate(
                            page=page_number,
                            text=text,
                            x_coord=x_min,
                            y_coord=y_min,
                            width=width,
                            height=height
                        )
                        crud.create_line_number(db=db, line_number=line_number_data, document_id=doc_id)

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"File not found: {e.filename}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing JSON file: {str(e)}")

    return {"message": "JSON processed and filtered line numbers created successfully"}

@app.get("/")
def read_root():
    return {"Hello": "World"} 