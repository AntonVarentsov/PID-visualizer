import os

from sqlalchemy.orm import Session


from backend import crud, schemas
from backend.database import SessionLocal, engine

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def populate_line_numbers_from_file(db: Session, document_id: int, ground_truth_file: str, ocr_results_file: str):
    """
    Populates the line_numbers table by matching text from a ground truth file
    with coordinates from the ocr_results table.
    """
    print("Starting line number population...")

    # 1. Read ground truth line numbers
    try:
        with open(ground_truth_file, 'r') as f:
            # Skip header lines and filter out empty lines
            true_lines = [line.strip() for line in f.readlines()[4:] if line.strip()]
        print(f"Found {len(true_lines)} line numbers in ground truth file.")
    except FileNotFoundError:
        print(f"Error: Ground truth file not found at {ground_truth_file}")
        return

    # 2. Get all OCR results for the document from the database
    # Assuming ocr_results are already populated from populate_db.py
    ocr_results = db.query(crud.models.OcrResult).filter(crud.models.OcrResult.document_id == document_id).all()
    if not ocr_results:
        print("No OCR results found in the database for this document. Please run populate_db.py first.")
        return
        
    ocr_map = {result.text: result for result in ocr_results}
    print(f"Found {len(ocr_map)} unique OCR results in the database.")

    # 3. Match and create new line number entries
    lines_created_count = 0
    for line_text in true_lines:
        if line_text in ocr_map:
            ocr_match = ocr_map[line_text]
            line_number_create = schemas.LineNumberCreate(
                text=ocr_match.text,
                x_coord=ocr_match.x_coord,
                y_coord=ocr_match.y_coord,
                width=ocr_match.width,
                height=ocr_match.height,
                status="pending" # Or any other default status
            )
            crud.create_line_number(db=db, line_number=line_number_create, document_id=document_id)
            lines_created_count += 1
        else:
            print(f"Warning: Line number '{line_text}' from ground truth file not found in OCR results.")

    print(f"Successfully created {lines_created_count} new entries in the line_numbers table.")


if __name__ == "__main__":
    db_session = next(get_db())
    
    # Assuming document with ID=1 exists from running populate_db.py
    doc_id = 1
    
    # Define paths relative to the project root
    truth_file = os.path.join('output', 'extracted_piping_lines.txt')
    ocr_file = os.path.join('data', 'test_pid.pdf_processed.json') # Used for populating ocr_results

    populate_line_numbers_from_file(db=db_session, document_id=doc_id, ground_truth_file=truth_file, ocr_results_file=ocr_file)
    
    db_session.close() 