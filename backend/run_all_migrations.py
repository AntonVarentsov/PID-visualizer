import json
import os

from backend import crud, schemas
from backend.database import get_session
from backend.ocr import load_parser
from backend.config import get_settings

parser = load_parser(get_settings().ocr_parser)

def parse_and_populate_all():
    """
    Parses the complex Google Document AI JSON and populates the database.
    This logic is based on the verified 'universal_parser.py'.
    It first populates ocr_results, then populates line_numbers from a ground truth file.
    """
    # --- Configuration ---
    json_path = os.path.join('output', 'test_pid.pdf_processed.json')
    DOCUMENT_ID = 1 # Assuming a single document for this project

    with get_session() as db:
        print(f"--- Starting Final Import for Document ID: {DOCUMENT_ID} ---")
    
        try:
            # --- Step 1: Ensure Document Exists ---
            doc = crud.get_document(db, DOCUMENT_ID)
            if not doc:
                print(f"Document with ID {DOCUMENT_ID} not found. Creating it.")
                doc_schema = schemas.DocumentCreate(file_name="test_pid.pdf", pages=1)
                crud.create_document(db=db, document=doc_schema)
            else:
                print(f"Using existing document with ID: {DOCUMENT_ID}")
            
            # --- Step 2: Clear Existing Data for a Clean Slate ---
            print(f"Deleting existing ocr_results for document ID: {DOCUMENT_ID}...")
            crud.delete_ocr_results_by_document(db=db, document_id=DOCUMENT_ID)
            print(f"Deleting existing line_numbers for document ID: {DOCUMENT_ID}...")
            crud.delete_line_numbers_by_document(db=db, document_id=DOCUMENT_ID)
            print("Existing data cleared.")
    
            # --- Step 3: Load the Document AI JSON and populate OCR results ---
            print(f"Loading Document AI JSON from {json_path}...")
            try:
                doc_ai_data = parser.parse(json_path)
            except FileNotFoundError:
                print(f"FATAL: JSON file not found at {json_path}")
                return
            except json.JSONDecodeError as e:
                print(f"FATAL: Invalid JSON format: {e}")
                return
            print("JSON loaded successfully.")
    
            created_count = parser.create_ocr_results(db, doc_ai_data, DOCUMENT_ID)
            print(f"Populated ocr_results table with {created_count} entries.")
    
            # --- Step 5: Populate line_numbers from ground truth ---
            print("\nPopulating line_numbers table from ground truth file...")
            truth_file_path = os.path.join('output', 'extracted_piping_lines.txt')
            with open(truth_file_path, 'r') as f:
                target_lines = [line.strip() for line in f.readlines()[4:] if line.strip()]
    
            lines_created_count = parser.create_line_numbers(db, target_lines, DOCUMENT_ID)
            print(f"Successfully created {lines_created_count} entries in line_numbers table.")
    
            print("\n--- Import Complete ---")
    
        except Exception as e:
            print(f"An error occurred during import: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("Database session closed.")
    
if __name__ == "__main__":
parse_and_populate_all() 
