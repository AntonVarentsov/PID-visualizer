import json
from database import SessionLocal
import crud
import schemas

def populate_database():
    """
    Populates the database with data from the processed JSON file.
    """
    db = SessionLocal()
    try:
        # 1. Read the processed JSON file
        json_path = '../data/test_pid.pdf_processed.json'
        with open(json_path, 'r') as f:
            data = json.load(f)

        # 2. Extract document info and create the document
        file_name = data.get('file_name', 'unknown.pdf')
        pages = data.get('pages', 0)
        
        doc_create_schema = schemas.DocumentCreate(file_name=file_name, pages=pages)
        db_document = crud.create_document(db=db, document=doc_create_schema)
        print(f"Created document '{db_document.file_name}' with ID: {db_document.id}")

        # 3. Create line numbers associated with the document
        line_numbers_data = data.get('line_numbers', [])
        if not line_numbers_data:
            print("No line numbers found in the JSON file.")
            return

        for line_data in line_numbers_data:
            line_create_schema = schemas.LineNumberCreate(
                page=line_data.get('page', 1), # Default to page 1 if not present
                text=line_data.get('text'),
                x_coord=line_data.get('x_coord'),
                y_coord=line_data.get('y_coord'),
                width=line_data.get('width'),
                height=line_data.get('height')
            )
            crud.create_line_number(db=db, line_number=line_create_schema, document_id=db_document.id)
        
        print(f"Successfully added {len(line_numbers_data)} line numbers to the document.")

    except FileNotFoundError:
        print(f"Error: JSON file not found at {json_path}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_database() 