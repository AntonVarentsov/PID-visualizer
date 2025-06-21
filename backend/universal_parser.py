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
    DOCUMENT_ID = 1

    db = SessionLocal()
    print(f"Starting import for document ID: {DOCUMENT_ID}")

    try:
        # 1. Delete existing line numbers for the document
        print(f"Deleting existing line numbers for document ID: {DOCUMENT_ID}...")
        crud.delete_line_numbers_by_document(db=db, document_id=DOCUMENT_ID)
        print("Existing line numbers deleted successfully.")

        # 2. Load the Document AI JSON
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

        # 3. Build a map of all text segments and their coordinates
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

        # 4. Import all found lines to database
        print("Importing all found lines to database...")
        unique_lines = set()
        new_lines_count = 0
        
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
                line_create_schema = schemas.LineNumberCreate(
                    page=coords["page"],
                    text=text_key,
                    x_coord=coords["x_coord"],
                    y_coord=coords["y_coord"],
                    width=coords["width"],
                    height=coords["height"]
                )
                crud.create_line_number(db=db, line_number=line_create_schema, document_id=DOCUMENT_ID)
                new_lines_count += 1

        print(f"Successfully added {new_lines_count} unique line numbers to document ID: {DOCUMENT_ID}.")

    except Exception as e:
        print(f"An error occurred during import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        print("Database session closed.")

if __name__ == "__main__":
    parse_document_ai_and_import() 