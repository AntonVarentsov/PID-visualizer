from database import engine
from models import Base

def create_database():
    """
    Creates all database tables based on the defined models.
    """
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully.")
    except Exception as e:
        print(f"An error occurred during table creation: {e}")

if __name__ == "__main__":
    create_database() 