from backend.database import get_session
from backend import crud, schemas

def create_test_document():
    """
    Creates a test document in the database.
    """
    with get_session() as db:
        print("Creating test document...")
        
        try:
            document_create = schemas.DocumentCreate(
                file_name="test_pid.pdf",
                pages=1
            )
            
            document = crud.create_document(db=db, document=document_create)
            print(f"Document created successfully with ID: {document.id}")
            return document.id
            
        except Exception as e:
            print(f"An error occurred: {e}")
            return None
if __name__ == "__main__":
    create_test_document() 
