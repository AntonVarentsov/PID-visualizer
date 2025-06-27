import os
import json
from backend.database import get_session
from backend import crud, schemas
from backend.ocr import load_parser
from backend.config import get_settings

parser = load_parser(get_settings().ocr_parser)

def parse_document_ai_and_import():
    """
    Parses Google Document AI JSON file and imports all line numbers into the database.
    Based on the working parser from parsers/import_lines.py
    """
    # --- Configuration ---
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(project_root, 'output', 'test_pid.pdf_processed.json')
    document_filename = "test_pid.pdf"

    with get_session() as db:
        
        try:
            # 1. Get or create the document
            print(f"Checking for document: {document_filename}...")
            db_document = crud.get_document_by_filename(db, filename=document_filename)
            if not db_document:
                print("Document not found, creating it...")
                doc_create = schemas.DocumentCreate(file_name=document_filename, pages=1) # Assuming 1 page for now
                db_document = crud.create_document(db, document=doc_create)
                print(f"Document created with ID: {db_document.id}")
            else:
                print(f"Document found with ID: {db_document.id}")
    
            DOCUMENT_ID = db_document.id
    
            # 2. Delete existing OCR results for the document
            print(f"Deleting existing OCR results for document ID: {DOCUMENT_ID}...")
            crud.delete_ocr_results_by_document(db=db, document_id=DOCUMENT_ID)
            # crud.delete_line_numbers_by_document(db=db, document_id=DOCUMENT_ID) # Old code
            print("Existing OCR results deleted successfully.")
    
            # 3. Load the Document AI JSON and import OCR results
            print(f"Loading Document AI JSON from {json_path}...")
            try:
                doc_ai_data = parser.parse(json_path)
            except FileNotFoundError:
                print(f"Error: JSON file not found at {json_path}")
                return
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON format: {e}")
                return
            print("JSON loaded successfully.")
    
            print("Importing OCR results into the database...")
            new_results_count = parser.create_ocr_results(db, doc_ai_data, DOCUMENT_ID)
            print(
                f"Successfully added {new_results_count} unique OCR results to document ID: {DOCUMENT_ID}."
            )
    
        except Exception as e:
            print(f"An error occurred during import: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("Database session closed.")

def parse_line_numbers():
    """
    Parses a text file of line numbers, finds them in ocr_results,
    and populates the line_numbers table.
    """
    # --- Configuration ---
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    lines_txt_path = os.path.join(project_root, 'data', 'extracted_piping_lines.txt')
    DOCUMENT_ID = 1 # Assuming the same document ID

    with get_session() as db:
        print("\nStarting line number import process...")
    
        try:
            # 1. Clear existing line numbers for the document
            print(f"Deleting existing line numbers for document ID: {DOCUMENT_ID}...")
            crud.delete_line_numbers_by_document(db=db, document_id=DOCUMENT_ID)
            print("Existing line numbers deleted successfully.")
    
            # 2. Read the list of line numbers to find
            print(f"Reading line numbers from {lines_txt_path}...")
            try:
                with open(lines_txt_path, 'r', encoding='utf-8') as f:
                    target_lines = [line.strip() for line in f if line.strip()]
            except FileNotFoundError:
                print(f"Error: Lines file not found at {lines_txt_path}")
                return
            print(f"Found {len(target_lines)} target line numbers to process.")
    
            # 3. Create line numbers from OCR results
            lines_created = parser.create_line_numbers(db, target_lines, DOCUMENT_ID)
            print(f"Successfully created {lines_created} entries in the line_numbers table.")
    
        except Exception as e:
            print(f"An error occurred during line number import: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("Database session for line number import closed.")

if __name__ == "__main__":
    parse_document_ai_and_import()
    parse_line_numbers() 