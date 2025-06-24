import json
import os
from database import SessionLocal
import crud
import schemas

def parse_document_ai_and_import():
    """
    Parses Google Document AI JSON file and imports all line numbers into the database.
    Based on the working parser from parsers/import_lines.py
    """
    # --- Configuration ---
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(project_root, 'output', 'test_pid.pdf_processed.json')
    document_filename = "test_pid.pdf"

    db = SessionLocal()
    
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

        # 3. Load the Document AI JSON
        print(f"Loading Document AI JSON from {json_path}...")
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                doc_ai_data = json.load(f)
        except FileNotFoundError:
            print(f"Error: JSON file not found at {json_path}")
            return
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON format: {e}")
            return
        print("JSON loaded successfully.")

        # 4. Build a map of all text segments and their coordinates
        print("Building a map of all text segments from the document...")
        text_map = {}
        for page_index, page in enumerate(doc_ai_data.get('pages', [])):
            page_width = page.get('dimension', {}).get('width')
            page_height = page.get('dimension', {}).get('height')
            if not page_width or not page_height:
                continue
            for line in page.get('lines', []):
                try:
                    start_index = int(line.get('layout', {}).get('textAnchor', {}).get('textSegments', [{}])[0].get('startIndex', 0))
                    end_index = int(line.get('layout', {}).get('textAnchor', {}).get('textSegments', [{}])[0].get('endIndex', 0))
                    line_text_content = doc_ai_data['text'][start_index:end_index].strip()
                except (KeyError, IndexError, TypeError):
                    continue
                normalized_text = line_text_content.replace('\\"', '"')
                vertices = line.get('layout', {}).get('boundingPoly', {}).get('normalizedVertices', [])
                if not vertices or not normalized_text:
                    continue
                x_coords = [v.get('x', 0) * page_width for v in vertices]
                y_coords = [v.get('y', 0) * page_height for v in vertices]
                min_x, max_x = min(x_coords), max(x_coords)
                min_y, max_y = min(y_coords), max(y_coords)
                text_map[normalized_text] = {
                    "page": page_index + 1, "x_coord": min_x, "y_coord": min_y,
                    "width": max_x - min_x, "height": max_y - min_y
                }
        print(f"Mapped {len(text_map)} unique text segments.")

        # 5. Import all found lines to the ocr_results table
        print("Importing all found lines to ocr_results table...")
        unique_lines = set()
        new_results_count = 0
        
        for text_key, coords in text_map.items():
            # Create a unique identifier for the line based on its text and coordinates
            line_tuple = (
                text_key,
                coords["x_coord"],
                coords["y_coord"],
                coords["width"],
                coords["height"]
            )
            
            if line_tuple not in unique_lines:
                unique_lines.add(line_tuple)
                
                # Use OcrResultCreate schema
                ocr_result_create_schema = schemas.OcrResultCreate(
                    page=coords["page"],
                    text=text_key,
                    x_coord=coords["x_coord"],
                    y_coord=coords["y_coord"],
                    width=coords["width"],
                    height=coords["height"]
                )
                crud.create_ocr_result(db=db, ocr_result=ocr_result_create_schema, document_id=DOCUMENT_ID)

                # Old code for LineNumber
                # line_create_schema = schemas.LineNumberCreate(
                #     page=coords["page"],
                #     text=text_key,
                #     x_coord=coords["x_coord"],
                #     y_coord=coords["y_coord"],
                #     width=coords["width"],
                #     height=coords["height"]
                # )
                # crud.create_line_number(db=db, line_number=line_create_schema, document_id=DOCUMENT_ID)
                
                new_results_count += 1

        print(f"Successfully added {new_results_count} unique OCR results to document ID: {DOCUMENT_ID}.")

    except Exception as e:
        print(f"An error occurred during import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
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

    db = SessionLocal()
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

        # 3. Find matching OCR results and create line_numbers
        lines_created = 0
        for line_text in target_lines:
            ocr_result = crud.get_ocr_result_by_text(db, text=line_text, document_id=DOCUMENT_ID)
            if ocr_result:
                line_create_schema = schemas.LineNumberCreate(
                    text=ocr_result.text,
                    x_coord=ocr_result.x_coord,
                    y_coord=ocr_result.y_coord,
                    width=ocr_result.width,
                    height=ocr_result.height,
                    status="pending"
                )
                crud.create_line_number(db=db, line_number=line_create_schema, document_id=DOCUMENT_ID)
                lines_created += 1
            else:
                print(f"Warning: Line number '{line_text}' not found in ocr_results for document ID {DOCUMENT_ID}.")
        
        print(f"Successfully created {lines_created} entries in the line_numbers table.")

    except Exception as e:
        print(f"An error occurred during line number import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        print("Database session for line number import closed.")

if __name__ == "__main__":
    parse_document_ai_and_import()
    parse_line_numbers() 