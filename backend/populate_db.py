import requests
import json
import os

from backend.config import get_settings

settings = get_settings()
API_BASE_URL = settings.api_base_url


def create_document(file_name="test_pid.pdf", pages=1):
    """Creates a document record in the database."""
    url = f"{API_BASE_URL}/documents/"
    payload = {"file_name": file_name, "pages": pages}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()  # Raise an exception for bad status codes
        doc_data = response.json()
        print(f"Successfully created document with ID: {doc_data['id']}")
        return doc_data["id"]
    except requests.exceptions.RequestException as e:
        print(f"Error creating document: {e}")
        return None


def populate_ocr_results(doc_id, json_file_path):
    """Populates the ocr_results table from a JSON file."""
    if not os.path.exists(json_file_path):
        print(f"Error: JSON file not found at {json_file_path}")
        return

    url = f"{API_BASE_URL}/documents/{doc_id}/parse-json"

    with open(json_file_path, "r") as f:
        data = json.load(f)

    try:
        response = requests.post(url, json=data)
        response.raise_for_status()
        print("Successfully populated ocr_results table.")
        print(f"Response: {response.json()}")
    except requests.exceptions.RequestException as e:
        print(f"Error populating ocr_results: {e}")
        if "response" in locals() and e.response is not None:
            print(f"Error details: {e.response.text}")


if __name__ == "__main__":
    print("Starting database population script...")
    # The script should be run from the root directory
    json_path = os.path.join(settings.data_dir, "test_pid.pdf_processed.json")

    document_id = create_document()
    if document_id:
        populate_ocr_results(document_id, json_path)
    print("Script finished.")
