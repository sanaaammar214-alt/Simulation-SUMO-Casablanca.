"""
config.py — Configuration centralisée chargée depuis .env
"""
import os
import platform
from dotenv import load_dotenv

load_dotenv()

# ─── MongoDB ──────────────────────────────────────────────────
MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB: str = os.getenv("MONGO_DB", "sumo_project")

# ─── SUMO ─────────────────────────────────────────────────────
def _default_sumo_home() -> str:
    system = platform.system()
    if system == "Windows":
        # On vérifie d'abord Program Files (64 bit)
        p64 = r"C:\Program Files\Eclipse\Sumo"
        if os.path.exists(p64):
            return p64
        return r"C:\Program Files (x86)\Eclipse\Sumo"
    elif system == "Darwin":
        return "/usr/local/opt/sumo/share/sumo"
    else:
        return "/usr/share/sumo"

SUMO_HOME: str = os.getenv("SUMO_HOME") or _default_sumo_home()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SUMO_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "sumo"))

SUMO_CFG = os.path.join(SUMO_DIR, "simulation.sumocfg")
NET_FILE = os.path.join(SUMO_DIR, "casablanca.net.xml")
TRIPS_FILE = os.path.join(SUMO_DIR, "trips.trips.xml")
ROUTES_FILE = os.path.join(SUMO_DIR, "routes.rou.xml")

# ─── Simulation ───────────────────────────────────────────────
DEFAULT_N_VEHICLES: int = int(os.getenv("DEFAULT_N_VEHICLES", 50))
DEFAULT_STEP_DELAY: float = float(os.getenv("DEFAULT_STEP_DELAY", 0.5))
MAX_TRAIL_POINTS: int = int(os.getenv("MAX_TRAIL_POINTS", 100))
CLUSTER_EVERY_N_STEPS: int = int(os.getenv("CLUSTER_EVERY_N_STEPS", 6))

# Durée de génération des départs SUMO
ROUTE_DEPART_DURATION: int = int(os.getenv("ROUTE_DEPART_DURATION", 60))

# ─── API ──────────────────────────────────────────────────────
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = int(os.getenv("API_PORT", 8000))

# ─── Casablanca coords ────────────────────────────────────────
CASA_LAT: float = 33.5883
CASA_LON: float = -7.6114