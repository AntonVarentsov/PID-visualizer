from .documents import router as documents_router
from .lines import router as lines_router
from .ocr import router as ocr_router

__all__ = [
    "documents_router",
    "lines_router",
    "ocr_router",
]
