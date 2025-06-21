import json
import requests
import os

def parse_and_import():
    """
    Parses a Google Document AI JSON file to find coordinates for specific line numbers
    and imports them into the database via the FastAPI backend.
    """
    # --- Configuration ---
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    json_path = os.path.join(project_root, 'output', 'test_pid.pdf_processed.json')
    lines_path = os.path.join(project_root, 'output', 'extracted_piping_lines.txt')
    api_url = "http://localhost:8000/documents/4/parse-json" # Document ID is 4

    # --- 1. Read target line numbers ---
    print(f"Reading target line numbers from {lines_path}...")
    with open(lines_path, 'r') as f:
        target_lines = {line.strip() for line in f.readlines()[4:] if line.strip()}
    print(f"Found {len(target_lines)} target lines.")

    # --- 2. Load the Document AI JSON ---
    print(f"Loading Document AI JSON from {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        doc_ai_data = json.load(f)
    print("JSON loaded successfully.")

    # --- 3. Build a map of all text segments and their coordinates ---
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

    # --- 4. Find coordinates for target lines using the map ---
    print("Matching target lines against the text map...")
    found_lines_data = []
    unmatched_targets = set(target_lines)
    for text_key, coords in text_map.items():
        for target in list(unmatched_targets):
            if target in text_key:
                line_data = {
                    "text": target, "page": coords["page"], "x_coord": coords["x_coord"],
                    "y_coord": coords["y_coord"], "width": coords["width"], "height": coords["height"]
                }
                found_lines_data.append(line_data)
                print(f"  - Matched '{target}' within '{text_key}'")
                unmatched_targets.remove(target)
                break
    print(f"Successfully extracted data for {len(found_lines_data)} lines.")
    if unmatched_targets:
        print("Warning: The following targets could not be matched:")
        for target in unmatched_targets:
            print(f"  - {target}")
    if not found_lines_data:
        print("No line data was extracted. Aborting API call.")
        return

    # --- 5. Send data to the backend ---
    print(f"Sending {len(found_lines_data)} records to the API at {api_url}...")
    payload = {"line_numbers": found_lines_data}
    try:
        response = requests.post(api_url, json=payload)
        response.raise_for_status()
        print("API Response:", response.json())
        print("Data imported successfully!")
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while calling the API: {e}")
        print("Response body:", e.response.text if e.response else "N/A")

if __name__ == "__main__":
    parse_and_import()
