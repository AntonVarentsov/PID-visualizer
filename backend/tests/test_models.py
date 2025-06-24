import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Document, OcrResult, LineNumber
from backend.database import Base

@pytest.fixture(scope='module')
def db_engine():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)

@pytest.fixture(scope='function')
def db_session(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.close()

def test_document_creation(db_session):
    doc = Document(file_name="test.pdf", pages=1)
    db_session.add(doc)
    db_session.commit()
    assert doc.id is not None
    assert doc.file_name == "test.pdf"

def test_ocr_result_creation(db_session):
    doc = Document(file_name="test2.pdf", pages=2)
    db_session.add(doc)
    db_session.commit()
    ocr = OcrResult(document_id=doc.id, page=1, text="123", x_coord=10, y_coord=20, width=30, height=40)
    db_session.add(ocr)
    db_session.commit()
    assert ocr.id is not None
    assert ocr.document_id == doc.id

def test_line_number_creation(db_session):
    doc = Document(file_name="test3.pdf", pages=3)
    db_session.add(doc)
    db_session.commit()
    line = LineNumber(document_id=doc.id, page=1, text="LN-001", x_coord=5, y_coord=5, width=10, height=10)
    db_session.add(line)
    db_session.commit()
    assert line.id is not None
    assert line.document_id == doc.id 