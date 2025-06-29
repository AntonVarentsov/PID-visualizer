import sys
import os
from pathlib import Path
import importlib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.main import create_app


def test_include_all_routers_dynamic_module():
    routers_dir = Path(__file__).resolve().parent.parent / "routers"
    temp_module = routers_dir / "temp_router.py"
    temp_module.write_text(
        """
from fastapi import APIRouter
router = APIRouter()
@router.get('/temp')
def read_temp():
    return {'temp': True}
"""
    )
    try:
        # Reload routers package to avoid caching
        import backend.routers
        importlib.reload(backend.routers)
        app = create_app()
        paths = [route.path for route in app.router.routes]
        assert "/temp" in paths
    finally:
        temp_module.unlink()
        sys.modules.pop("backend.routers.temp_router", None)

