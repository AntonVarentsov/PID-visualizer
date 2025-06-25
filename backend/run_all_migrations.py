import json
import os


from backend import crud, schemas
from backend.database import SessionLocal

def parse_and_populate_all():
    """
    Parses the complex Google Document AI JSON and populates the database.
    This logic is based on the verified 'universal_parser.py'.
    It first populates ocr_results, then populates line_numbers from a ground truth file.
    """
    # --- Configuration ---
    json_path = os.path.join('output', 'test_pid.pdf_processed.json')
    DOCUMENT_ID = 1 # Assuming a single document for this project

    db = SessionLocal()
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

        # --- Step 3: Load the Document AI JSON ---
        print(f"Loading Document AI JSON from {json_path}...")
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                doc_ai_data = json.load(f)
        except FileNotFoundError:
            print(f"FATAL: JSON file not found at {json_path}")
            return
        except json.JSONDecodeError as e:
            print(f"FATAL: Invalid JSON format: {e}")
            return
        print("JSON loaded successfully.")

        # --- Step 4: Parse JSON and Populate ocr_results table ---
        print("Building a map of all text segments from the document...")
        ocr_results_to_create = []
        for page in doc_ai_data.get('pages', []):
            page_width = page.get('dimension', {}).get('width')
            page_height = page.get('dimension', {}).get('height')
            if not page_width or not page_height:
                continue

            for line in page.get('lines', []):
                try:
                    text_anchor = line.get('layout', {}).get('textAnchor', {})
                    text_segments = text_anchor.get('textSegments', [{}])
                    start_index = int(text_segments[0].get('startIndex', 0))
                    end_index = int(text_segments[0].get('endIndex', 0))
                    line_text = doc_ai_data['text'][start_index:end_index].strip().replace('\\n', ' ').replace('\n', ' ')
                    
                    vertices = line.get('layout', {}).get('boundingPoly', {}).get('normalizedVertices', [])
                    if not vertices or not line_text:
                        continue
                        
                    x_coords = [v.get('x', 0) * page_width for v in vertices]
                    y_coords = [v.get('y', 0) * page_height for v in vertices]
                    min_x, max_x = min(x_coords), max(x_coords)
                    min_y, max_y = min(y_coords), max(y_coords)
                    
                    ocr_results_to_create.append(schemas.OcrResultCreate(
                        page=page.get('pageNumber', 1),
                        text=line_text,
                        x_coord=min_x, y_coord=min_y,
                        width=max_x - min_x, height=max_y - min_y
                    ))
                except (KeyError, IndexError, TypeError):
                    continue
        
        print(f"Mapped {len(ocr_results_to_create)} text segments. Populating ocr_results table...")
        for ocr_schema in ocr_results_to_create:
            crud.create_ocr_result(db=db, ocr_result=ocr_schema, document_id=DOCUMENT_ID)
        print("ocr_results table populated successfully.")

        # --- Step 5: Populate line_numbers from ground truth ---
        print("\nPopulating line_numbers table from ground truth file...")
        truth_file_path = os.path.join('output', 'extracted_piping_lines.txt')
        with open(truth_file_path, 'r') as f:
            target_lines = {line.strip() for line in f.readlines()[4:] if line.strip()}

        all_ocr_results = crud.get_ocr_results(db=db, document_id=DOCUMENT_ID)
        
        lines_created_count = 0
        for ocr_result in all_ocr_results:
            if ocr_result.text in target_lines:
                line_schema = schemas.LineNumberCreate(
                    text=ocr_result.text,
                    x_coord=ocr_result.x_coord,
                    y_coord=ocr_result.y_coord,
                    width=ocr_result.width,
                    height=ocr_result.height,
                    page=ocr_result.page
                )
                crud.create_line_number(db=db, line_number=line_schema, document_id=DOCUMENT_ID)
                lines_created_count += 1
        print(f"Successfully created {lines_created_count} entries in line_numbers table.")

        print("\n--- Import Complete ---")

    except Exception as e:
        print(f"An error occurred during import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        print("Database session closed.")

if __name__ == "__main__":
    parse_and_populate_all() 