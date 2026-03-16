
import os
import sys
import logging

# Configuration des logs
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("verify_env")

def verify_sumo():
    sumo_home = os.environ.get("SUMO_HOME")
    if not sumo_home:
        log.error("SUMO_HOME n'est pas défini dans les variables d'environnement.")
        return False
    log.info(f"SUMO_HOME trouvé : {sumo_home}")
    
    sys.path.append(os.path.join(sumo_home, "tools"))
    try:
        import traci
        log.info("TraCI a été importé avec succès.")
    except ImportError:
        log.error("Impossible d'importer TraCI. Vérifiez votre installation de SUMO.")
        return False
    
    # Vérifier la présence du binaire sumo
    sumo_binary = os.path.join(sumo_home, "bin", "sumo.exe" if os.name == "nt" else "sumo")
    if not os.path.exists(sumo_binary):
        log.error(f"Binaire SUMO introuvable à l'adresse : {sumo_binary}")
        return False
    log.info(f"Binaire SUMO trouvé : {sumo_binary}")
    return True

def verify_mongodb():
    try:
        from pymongo import MongoClient
        client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
        client.server_info()
        log.info("Connexion à MongoDB réussie sur localhost:27017.")
        return True
    except Exception as e:
        log.warning(f"MongoDB non disponible ou erreur de connexion : {e}")
        return False

def verify_config_files():
    files = [
        "../sumo/casablanca.net.xml",
        "../sumo/simulation.sumocfg",
        "routes.rou.xml"
    ]
    all_exist = True
    for f in files:
        path = os.path.join("projet_sumo/backend", f) if not os.path.exists(f) else f
        if os.path.exists(path):
            log.info(f"Fichier trouvé : {path}")
        else:
            log.error(f"Fichier MANQUANT : {path}")
            all_exist = False
    return all_exist

if __name__ == "__main__":
    log.info("--- Diagnostic du Projet SUMO Casa ---")
    s = verify_sumo()
    m = verify_mongodb()
    c = verify_config_files()
    
    if s and c:
        log.info("\nL'environnement de simulation est prêt !")
        if not m:
            log.warning("Note : La simulation peut tourner sans MongoDB mais les données ne seront pas sauvegardées.")
    else:
        log.error("\nDes erreurs ont été détectées. Veuillez corriger les points ci-dessus.")
