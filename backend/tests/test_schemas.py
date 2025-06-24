import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import pytest
from pydantic import ValidationError
from backend.schemas import DocumentCreate, OcrResultCreate, LineNumberCreate

def test_document_create_valid():
    doc = DocumentCreate(file_name="test.pdf", pages=1)
    assert doc.file_name == "test.pdf"
    assert doc.pages == 1

def test_document_create_invalid_filename():
    with pytest.raises(ValidationError):
        DocumentCreate(file_name=None, pages=1)

def test_ocr_result_create_valid():
    ocr = OcrResultCreate(page=1, text="123", x_coord=10, y_coord=20, width=30, height=40)
    assert ocr.text == "123"
    assert ocr.page == 1

def test_ocr_result_negative_coordinates():
    ocr = OcrResultCreate(page=1, text="123", x_coord=-10, y_coord=-20, width=30, height=40)
    assert ocr.x_coord == -10
    assert ocr.y_coord == -20

def test_line_number_create_empty_text():
    line = LineNumberCreate(page=1, text=None, x_coord=5, y_coord=5, width=10, height=10)
    assert line.text is None 