from backend.database import get_session

def get_db():
    with get_session() as db:
        yield db
