"""
DEPRECATED: This module has been renamed to validators.py.
This shim exists for backward compatibility only — import from validators directly.
"""
import warnings as _warnings
_warnings.warn(
    "backend.utils is deprecated; use backend.validators instead.",
    DeprecationWarning,
    stacklevel=2,
)

try:
    from backend.validators import parse_int, _parse_int
except ImportError:
    from validators import parse_int, _parse_int

__all__ = ['parse_int', '_parse_int']
