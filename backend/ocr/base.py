"""Base classes for OCR parsers."""

from typing import Any


class BaseOcrParser:
    """Abstract OCR parser."""

    def parse(self, file_or_data: Any):
        """Parse a file path or already loaded data.

        Subclasses must implement this method and return a representation that
        subsequent processing steps can use.
        """
        raise NotImplementedError
