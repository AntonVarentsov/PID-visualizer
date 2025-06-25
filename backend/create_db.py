from backend.database import engine
from backend.models import Base

def create_database():
    """
    Creates all database tables based on the defined models.
    """
    print("Creating database tables...")
    try:
        # checkfirst=True prevents errors if tables already exist
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("Database tables created successfully.")
    except Exception as e:
        print(f"An error occurred during table creation: {e}")

if __name__ == "__main__":
    create_database() 