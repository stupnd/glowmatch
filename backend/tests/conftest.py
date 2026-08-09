"""Pytest configuration for backend tests.

Adds the backend root to sys.path so tests can import backend modules
(color_utils, detection.*, api.*) regardless of which directory pytest
is invoked from.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
