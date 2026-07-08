import sys
from pathlib import Path

_here = Path(__file__).parent

# backend/apps → "titanic.*" 임포트
_apps_dir = str(_here.parent.parent)
if _apps_dir not in sys.path:
    sys.path.insert(0, _apps_dir)

# backend → "core.*" 임포트 (ORM·matrix)
_backend_dir = str(_here.parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)