import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import importlib
import pkgutil
import app.models as _models

# Pre-import all model modules so SQLAlchemy's declarative mapper
# can resolve all string relationships (e.g. "Wallet", "EmergencyContact").
for _mod in pkgutil.iter_modules(_models.__path__):
    importlib.import_module(f"app.models.{_mod.name}")
