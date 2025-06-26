"""Parser for Google Document AI JSON output."""

import json
from typing import Iterable, Any
from sqlalchemy.orm import Session

from .base import BaseOcrParser
from backend import crud, schemas


class DocumentAiParser(BaseOcrParser):
    """Parse Google Document AI results."""

    def parse(self, file_or_data: Any) -> dict:
        """Return Document AI data as a dictionary."""
        if isinstance(file_or_data, str):
            with open(file_or_data, "r", encoding="utf-8") as f:
                return json.load(f)
        return file_or_data

    def create_ocr_results(self, db: Session, doc_ai_data: dict, document_id: int) -> int:
        """Parse Document AI JSON and create ``OcrResult`` records.

        Returns the number of created records.
        """
        created = 0
        for page in doc_ai_data.get("pages", []):
            page_width = page.get("dimension", {}).get("width")
            page_height = page.get("dimension", {}).get("height")
            if not page_width or not page_height:
                continue

            for line in page.get("lines", []):
                try:
                    text_anchor = line.get("layout", {}).get("textAnchor", {})
                    text_segments = text_anchor.get("textSegments", [{}])
                    start_index = int(text_segments[0].get("startIndex", 0))
                    end_index = int(text_segments[0].get("endIndex", 0))
                    text = (
                        doc_ai_data["text"][start_index:end_index]
                        .strip()
                        .replace("\n", " ")
                    )
                    vertices = (
                        line.get("layout", {})
                        .get("boundingPoly", {})
                        .get("normalizedVertices", [])
                    )
                    if not vertices or not text:
                        continue
                    x_coords = [v.get("x", 0) * page_width for v in vertices]
                    y_coords = [v.get("y", 0) * page_height for v in vertices]
                    min_x, max_x = min(x_coords), max(x_coords)
                    min_y, max_y = min(y_coords), max(y_coords)
                    schema = schemas.OcrResultCreate(
                        page=page.get("pageNumber", 1),
                        text=text,
                        x_coord=min_x,
                        y_coord=min_y,
                        width=max_x - min_x,
                        height=max_y - min_y,
                    )
                    crud.create_ocr_result(db=db, ocr_result=schema, document_id=document_id)
                    created += 1
                except (KeyError, IndexError, TypeError):
                    continue
        return created

    def create_line_numbers(
        self,
        db: Session,
        ground_truth_lines: Iterable[str],
        document_id: int,
    ) -> int:
        """Create ``LineNumber`` records for ``ground_truth_lines`` using existing OCR results."""
        target_set = {line.strip() for line in ground_truth_lines if line.strip()}
        if not target_set:
            return 0

        ocr_results = crud.get_ocr_results(db=db, document_id=document_id)
        created = 0
        for result in ocr_results:
            if result.text in target_set:
                line_schema = schemas.LineNumberCreate(
                    page=result.page,
                    text=result.text,
                    x_coord=result.x_coord,
                    y_coord=result.y_coord,
                    width=result.width,
                    height=result.height,
                )
                crud.create_line_number(db=db, line_number=line_schema, document_id=document_id)
                created += 1
        return created

