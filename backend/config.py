"""
Backward compatibility shim for backend.config -> backend.app.core.config
"""
from backend.app.core.config import Config, TestConfig

__all__ = ['Config', 'TestConfig']
