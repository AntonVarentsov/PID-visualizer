"""Compatibility wrappers around :mod:`backend.ocr.document_ai`."""

from typing import Iterable
from sqlalchemy.orm import Session

from backend.ocr.document_ai import DocumentAiParser

_parser = DocumentAiParser()

load_json = _parser.parse
create_ocr_results = _parser.create_ocr_results
create_line_numbers = _parser.create_line_numbers

__all__ = [
    "DocumentAiParser",
    "load_json",
    "create_ocr_results",
    "create_line_numbers",
]
