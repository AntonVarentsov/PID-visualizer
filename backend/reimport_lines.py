import json
from database import SessionLocal
import crud
import schemas
import os

# The ID of the document we want to re-import lines for.
DOCUMENT_ID = 1
# Path to the JSON file relative to the script's location in backend/
JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'output', 'test_pid.pdf_processed.json')


def reimport_lines_for_document():
    """
    Deletes all existing line numbers for a specific document
    and re-imports them from a JSON file, ensuring no duplicates.
    """
    db = SessionLocal()
    print(f"Starting re-import for document ID: {DOCUMENT_ID}")

    try:
        # 1. Delete existing line numbers for the document
        print(f"Deleting existing line numbers for document ID: {DOCUMENT_ID}...")
        crud.delete_line_numbers_by_document(db=db, document_id=DOCUMENT_ID)
        print("Existing line numbers deleted successfully.")

        # 2. Read the processed JSON file
        print(f"Reading JSON file from: {JSON_PATH}")
        line_numbers_data = []
        try:
            with open(JSON_PATH, 'r', encoding='utf-8') as f:
                for line in f:
                    try:
                        # Attempt to parse each line as a JSON object (JSONL format)
                        if line.strip(): # Avoid empty lines
                            line_data = json.loads(line)
                            line_numbers_data.append(line_data)
                    except json.JSONDecodeError:
                        print(f"Skipping invalid JSON line: {line.strip()}")
                        continue
        except FileNotFoundError:
            print(f"Error: JSON file not found at {JSON_PATH}")
            return
        
        # 3. Create unique line numbers associated with the document
        if not line_numbers_data:
            print("No line numbers found or parsed in the JSON file.")
            return

        unique_lines = set()
        new_lines_count = 0
        for line_data in line_numbers_data:
            # Create a unique identifier for the line based on its text and coordinates
            line_tuple = (
                line_data.get('text'),
                line_data.get('x_coord'),
                line_data.get('y_coord'),
                line_data.get('width'),
                line_data.get('height')
            )
            
            if line_tuple not in unique_lines:
                unique_lines.add(line_tuple)
                line_create_schema = schemas.LineNumberCreate(
                    page=line_data.get('page', 1),
                    text=line_data.get('text'),
                    x_coord=line_data.get('x_coord'),
                    y_coord=line_data.get('y_coord'),
                    width=line_data.get('width'),
                    height=line_data.get('height')
                )
                crud.create_line_number(db=db, line_number=line_create_schema, document_id=DOCUMENT_ID)
                new_lines_count += 1

        print(f"Successfully added {new_lines_count} unique line numbers to document ID: {DOCUMENT_ID}.")

    except Exception as e:
        print(f"An error occurred during re-import: {e}")
    finally:
        db.close()
        print("Database session closed.")

if __name__ == "__main__":
    reimport_lines_for_document() 