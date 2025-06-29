"""Router package exposing helper to include all routers."""

from importlib import import_module
import pkgutil
from fastapi import FastAPI


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

    "include_all_routers",
]


def include_all_routers(app: FastAPI) -> None:
    """Discover and include all routers in this package.

    Iterates over modules in ``backend.routers`` and, if a module defines a
    ``router`` attribute, includes it on the given ``FastAPI`` application.
    """

    package = __name__
    for _, module_name, _ in pkgutil.iter_modules(__path__):
        module = import_module(f"{package}.{module_name}")
        router = getattr(module, "router", None)
        if router is not None:
            app.include_router(router)
