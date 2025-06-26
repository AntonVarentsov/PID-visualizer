import os
from backend.database import get_session
from backend import crud
from backend.ocr import load_parser

parser = load_parser("document_ai")

# The ID of the document we are processing.
DOCUMENT_ID = 1
# Path to the text file containing the target line numbers.
TARGET_LINES_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'extracted_piping_lines.txt')



def reimport_lines_from_db():
    """
    Deletes all existing line numbers for a document and repopulates them
    by filtering the existing OCR results from the database.
    """
    with get_session() as db:
        print(f"Starting line number import from DB for document ID: {DOCUMENT_ID}")
    
        try:
            # 1. Delete existing line numbers for the document
            print(f"Deleting existing line numbers for document ID: {DOCUMENT_ID}...")
            crud.delete_line_numbers_by_document(db=db, document_id=DOCUMENT_ID)
            print("Existing line numbers deleted.")
    
            # 2. Read the target line numbers from the text file
            print(f"Reading target line numbers from: {TARGET_LINES_PATH}")
            try:
                with open(TARGET_LINES_PATH, 'r', encoding='utf-8') as f:
                    target_texts = f.readlines()
            except FileNotFoundError:
                print(f"Error: Target lines file not found at {TARGET_LINES_PATH}")
                return
                
            if not target_texts:
                print("No target line numbers found in the file.")
                return
    
            # 3. Create line numbers from existing OCR results
            created = parser.create_line_numbers(db, target_texts, DOCUMENT_ID)
            print(f"Successfully created {created} new line number entries.")
    
        except Exception as e:
            print(f"An error occurred during re-import: {e}")
        finally:
            print("Database session closed.")
    
    if __name__ == "__main__":
        reimport_lines_from_db() 
