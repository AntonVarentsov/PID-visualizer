import os

from sqlalchemy.orm import Session


from backend.database import SessionLocal, engine
from backend.parsers import document_ai

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

    # 2. Create line number entries from existing OCR results
    lines_created_count = document_ai.create_line_numbers(db, true_lines, document_id)
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