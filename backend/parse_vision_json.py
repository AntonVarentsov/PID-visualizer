import json
import os
from backend.database import get_session
from backend import crud, schemas

# The ID of the document we want to import lines for.
DOCUMENT_ID = 1
# Path to the JSON file relative to the script's location in backend/
JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'output', 'test_pid.pdf_processed.json')

def parse_vision_json_and_import():
    """
    Parses Google Vision API JSON response and imports line numbers.
    """
    with get_session() as db:
        print(f"Starting import for document ID: {DOCUMENT_ID}")
    
        try:
            # 1. Delete existing line numbers for the document
            print(f"Deleting existing line numbers for document ID: {DOCUMENT_ID}...")
            crud.delete_line_numbers_by_document(db=db, document_id=DOCUMENT_ID)
            print("Existing line numbers deleted successfully.")
    
            # 2. Read the JSON file
            print(f"Reading JSON file from: {JSON_PATH}")
            try:
                with open(JSON_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except FileNotFoundError:
                print(f"Error: JSON file not found at {JSON_PATH}")
                return
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON format: {e}")
                return
    
            # 3. Extract text blocks from Vision API response
            line_numbers_data = []
            
            if 'responses' in data and len(data['responses']) > 0:
                response = data['responses'][0]
                
                if 'textAnnotations' in response and len(response['textAnnotations']) > 0:
                    # Skip the first annotation as it contains the full text
                    text_annotations = response['textAnnotations'][1:]
                    
                    for annotation in text_annotations:
                        if 'boundingPoly' in annotation and 'vertices' in annotation['boundingPoly']:
                            vertices = annotation['boundingPoly']['vertices']
                            
                            if len(vertices) >= 4:
                                # Calculate bounding box
                                x_coords = [v['x'] for v in vertices]
                                y_coords = [v['y'] for v in vertices]
                                
                                x_coord = min(x_coords)
                                y_coord = min(y_coords)
                                width = max(x_coords) - min(x_coords)
                                height = max(y_coords) - min(y_coords)
                                
                                # Get text content
                                text = annotation.get('description', '').strip()
                                
                                if text:  # Only add if there's actual text
                                    line_numbers_data.append({
                                        'text': text,
                                        'x_coord': x_coord,
                                        'y_coord': y_coord,
                                        'width': width,
                                        'height': height
                                    })
    
            # 4. Create unique line numbers
            if not line_numbers_data:
                print("No line numbers found in the JSON file.")
                return
    
            unique_lines = set()
            new_lines_count = 0
            
            for line_data in line_numbers_data:
                # Create a unique identifier for the line based on its text and coordinates
                line_tuple = (
                    line_data['text'],
                    line_data['x_coord'],
                    line_data['y_coord'],
                    line_data['width'],
                    line_data['height']
                )
                
                if line_tuple not in unique_lines:
                    unique_lines.add(line_tuple)
                    line_create_schema = schemas.LineNumberCreate(
                        page=1,  # Assuming single page for now
                        text=line_data['text'],
                        x_coord=line_data['x_coord'],
                        y_coord=line_data['y_coord'],
                        width=line_data['width'],
                        height=line_data['height']
                    )
                    crud.create_line_number(db=db, line_number=line_create_schema, document_id=DOCUMENT_ID)
                    new_lines_count += 1
    
            print(f"Successfully added {new_lines_count} unique line numbers to document ID: {DOCUMENT_ID}.")
    
        except Exception as e:
            print(f"An error occurred during import: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("Database session closed.")

if __name__ == "__main__":
    parse_vision_json_and_import() 