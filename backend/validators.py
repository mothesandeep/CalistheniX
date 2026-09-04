"""
Backward compatibility shim for backend.validators -> backend.app.utils.validators
"""
from backend.app.utils.validators import parse_int, _parse_int

__all__ = ['parse_int', '_parse_int']
