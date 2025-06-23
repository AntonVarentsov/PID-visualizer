import os
from typing import List
from database import SessionLocal
import crud
import schemas
from models import OcrResult

# The ID of the document we are processing.
DOCUMENT_ID = 1
# Path to the text file containing the target line numbers.
TARGET_LINES_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'extracted_piping_lines.txt')


def filter_line_numbers(ocr_results: List[OcrResult], target_texts: List[str]) -> List[OcrResult]:
    """
    Filters OCR results to find those that exactly match the target texts.

    In the future, this function can be modified to use regular expressions
    or more complex matching logic.

    Args:
        ocr_results: A list of OcrResult objects from the database.
        target_texts: A list of strings to search for.

    Returns:
        A list of matching OcrResult objects.
    """
    print(f"Filtering {len(ocr_results)} OCR results against {len(target_texts)} target texts.")
    
    # Create a set for faster lookups
    target_set = set(t.strip() for t in target_texts if t.strip())
    
    found_results = []
    for result in ocr_results:
        if result.text and result.text.strip() in target_set:
            found_results.append(result)
            
    print(f"Found {len(found_results)} matching line numbers.")
    return found_results


def reimport_lines_from_db():
    """
    Deletes all existing line numbers for a document and repopulates them
    by filtering the existing OCR results from the database.
    """
    db = SessionLocal()
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

        # 3. Get all OCR results from the database for the document
        print("Fetching all OCR results from the database...")
        all_ocr_results = crud.get_all_ocr_results_for_document(db=db, document_id=DOCUMENT_ID)
        if not all_ocr_results:
            print("No OCR results found in the database for this document.")
            return

        # 4. Filter the results
        matched_results = filter_line_numbers(all_ocr_results, target_texts)

        # 5. Create new LineNumber entries from the filtered results
        for ocr_result in matched_results:
            line_create_schema = schemas.LineNumberCreate(
                page=ocr_result.page,
                text=ocr_result.text,
                x_coord=ocr_result.x_coord,
                y_coord=ocr_result.y_coord,
                width=ocr_result.width,
                height=ocr_result.height,
                status="pending"  # Or copy from ocr_result if needed
            )
            crud.create_line_number(db=db, line_number=line_create_schema, document_id=DOCUMENT_ID)

        print(f"Successfully created {len(matched_results)} new line number entries.")

    except Exception as e:
        print(f"An error occurred during re-import: {e}")
    finally:
        db.close()
        print("Database session closed.")

if __name__ == "__main__":
    reimport_lines_from_db() 