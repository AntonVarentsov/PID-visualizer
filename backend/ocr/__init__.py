"""OCR parsing utilities and plugin loader."""

from .base import BaseOcrParser
import importlib
from importlib import metadata


def load_parser(name: str) -> BaseOcrParser:
    """Load an OCR parser by name.

    The loader first tries to resolve the parser from entry points using the
    ``pid_visualizer.ocr_parsers`` group. If nothing is found, ``name`` is
    treated as a module path in ``module:Class`` format.
    """
    # Attempt to load from entry points
    try:
        eps = metadata.entry_points()
        if hasattr(eps, "select"):
            candidates = eps.select(group="pid_visualizer.ocr_parsers")
        else:  # backward compatibility
            candidates = eps.get("pid_visualizer.ocr_parsers", [])
        for ep in candidates:
            if ep.name == name:
                parser_cls = ep.load()
                if not issubclass(parser_cls, BaseOcrParser):
                    raise TypeError(f"Entry point '{name}' does not provide a BaseOcrParser")
                return parser_cls()
    except Exception:
        pass

    # Fallback: treat name as module[:class]
    module_path, _, class_name = name.partition(":")
    mod = importlib.import_module(module_path)
    parser_cls = getattr(mod, class_name or "Parser")
    if not issubclass(parser_cls, BaseOcrParser):
        raise TypeError(f"{parser_cls} is not a BaseOcrParser")
    return parser_cls()

__all__ = ["BaseOcrParser", "load_parser"]
