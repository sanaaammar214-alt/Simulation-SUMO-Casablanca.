# 🚗 SUMO Casa — Simulation & Clustering du Trafic (Casablanca)

Bienvenue dans le projet **SUMO Casa**, une plateforme intégrée d'analyse et de visualisation du trafic routier basée sur la ville de Casablanca. Ce projet combine la simulation microscopique (SUMO), l'analyse de données massives (clustering de trajectoires) et une interface web moderne.

---

## 👨‍🏫 À l'attention de l'examinateur

Ce projet a été conçu pour démontrer l'application d'algorithmes de **Machine Learning non supervisé** sur des données de mobilité urbaine.

### Points clés de l'implémentation :
1.  **Simulation Réaliste** : Utilisation d'OpenStreetMap (OSM) pour extraire le réseau routier de Casablanca (zone centrale) et injection de trafic via SUMO/TraCI.
2.  **Pipeline d'Analyse** : 
    *   **Collecte en temps réel** : Les positions (x, y), vitesses et angles des véhicules sont persistés dans MongoDB pendant la simulation.
    *   **Feature Engineering** : Calcul de caractéristiques avancées par trajectoire (vitesse moyenne, sinuosité, zone de départ/arrivée).
    *   **Clustering Multi-Algorithmes** : Comparaison de 6 approches majeures :
        *   **K-Means** (basé sur les features agrégées).
        *   **DBSCAN & HDBSCAN** (densité spatiale).
        *   **Spectral Clustering** (graphe de similarité).
        *   **ST-DBSCAN** (densité spatio-temporelle).
        *   **TRACLUS** (partitionnement de segments de trajectoires).
3.  **Visualisation Interactive** : Utilisation de **Deck.gl** et **MapLibre** pour afficher des milliers de points et trajectoires avec une fluidité optimale.

---

## 🚀 Étapes pour démarrer le projet

### 1. Prérequis système
Avant de commencer, assurez-vous d'avoir installé :
*   **SUMO** (Simulation of Urban MObility) : [Télécharger ici](https://eclipse.dev/sumo/).
*   **MongoDB** : Doit être en cours d'exécution sur le port par défaut (`27017`).
*   **Python 3.10+**
*   **Node.js 18+**

> **Note importante (Windows)** : Assurez-vous que la variable d'environnement `SUMO_HOME` pointe vers votre dossier d'installation SUMO (ex: `C:\Program Files (x86)\Eclipse\Sumo`).

### 2. Configuration & Installation

#### 📦 Backend (Python + FastAPI)
```bash
cd projet_sumo/backend
python -m venv .venv
# Activer le venv :
# Windows: .venv\Scripts\activate | Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```

#### 📦 Frontend (React + Vite)
```bash
cd projet_sumo/frontend
npm install
```

### 3. Lancement de l'application

Pour que l'application fonctionne, vous devez lancer les deux serveurs en parallèle :

1.  **Lancer le Backend** :
    ```bash
    cd projet_sumo/backend
    uvicorn main:app --reload
    ```
    *L'API sera disponible sur `http://localhost:8000`.*

2.  **Lancer le Frontend** :
    ```bash
    cd projet_sumo/frontend
    npm run dev
    ```
    *L'interface sera accessible sur `http://localhost:5173`.*

---

## 🛠️ Guide d'utilisation

1.  **Lancer une Simulation** : 
    *   Sur l'interface web, réglez le nombre de véhicules (ex: 100) et cliquez sur **"Start Simulation"**.
    *   Vous verrez les véhicules se déplacer en temps réel sur la carte de Casablanca.
2.  **Générer l'Analyse** :
    *   Cliquez sur **"Stop Simulation"**. 
    *   À cet instant, le backend lance automatiquement la pipeline d'analyse (calcul des features et exécution des algorithmes de clustering).
    *   Une barre de progression/statut s'affichera dans l'onglet "Analysis".
3.  **Visualiser les Résultats** :
    *   Une fois l'analyse terminée, naviguez entre les différents algorithmes (K-Means, DBSCAN, etc.) via la barre latérale pour voir les groupes (clusters) de véhicules identifiés.

---

## 📂 Structure du Projet

*   `/sumo` : Fichiers de configuration du réseau (`.net.xml`) et de la demande de trafic de Casablanca.
*   `/backend` : 
    *   `main.py` : Points d'entrée de l'API.
    *   `simulation.py` : Interface avec le moteur SUMO (TraCI).
    *   `analytics/` : Implémentation de chaque algorithme de clustering.
*   `/frontend` : 
    *   `src/components/layers/` : Logique de rendu Deck.gl pour chaque algorithme.
    *   `src/api/` : Client de communication avec le backend.

---
*Projet réalisé dans le cadre de l'étude des systèmes de transport intelligents (ITS) et du Machine Learning appliqué.*
