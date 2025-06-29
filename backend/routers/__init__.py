from .documents import router as documents_router
from .lines import router as lines_router
from .ocr import router as ocr_router

import importlib
import pkgutil
from fastapi import APIRouter
from typing import Iterator


def iter_routers() -> Iterator[APIRouter]:
    """Yield all ``APIRouter`` objects found in this package."""
    for info in pkgutil.iter_modules(__path__):
        module = importlib.import_module(f"{__name__}.{info.name}")
        router = getattr(module, "router", None)
        if isinstance(router, APIRouter):
            yield router


__all__ = [
    "documents_router",
    "lines_router",
    "ocr_router",
    "iter_routers",
]
