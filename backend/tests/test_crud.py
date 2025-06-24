import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import pytest
from backend import crud, schemas
from backend.models import Document, OcrResult, LineNumber
from backend.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

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

def test_create_and_get_document(db_session):
    doc_data = schemas.DocumentCreate(file_name="test.pdf", pages=1)
    doc = crud.create_document(db_session, doc_data)
    fetched = crud.get_document(db_session, doc.id)
    assert fetched is not None
    assert fetched.file_name == "test.pdf"

def test_create_and_get_ocr_result(db_session):
    doc = crud.create_document(db_session, schemas.DocumentCreate(file_name="ocr.pdf", pages=1))
    ocr_data = schemas.OcrResultCreate(page=1, text="123", x_coord=10, y_coord=20, width=30, height=40)
    ocr = crud.create_ocr_result(db_session, ocr_data, doc.id)
    fetched = crud.get_ocr_result_by_text(db_session, "123", doc.id)
    assert fetched is not None
    assert fetched.text == "123"

def test_create_and_get_line_number(db_session):
    doc = crud.create_document(db_session, schemas.DocumentCreate(file_name="line.pdf", pages=1))
    line_data = schemas.LineNumberCreate(page=1, text="LN-001", x_coord=5, y_coord=5, width=10, height=10)
    line = crud.create_line_number(db_session, line_data, doc.id)
    assert line is not None
    assert line.text == "LN-001" 