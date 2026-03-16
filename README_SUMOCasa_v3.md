# 🚗 SUMOCasa v3 — Simulation & Clustering du Trafic Urbain (Casablanca)

> Plateforme intégrée d'analyse et de visualisation du trafic routier de Casablanca, combinant simulation microscopique SUMO, pipeline de clustering multi-algorithmes, et interface de monitoring temps réel.

---

## 🎯 Objectif pédagogique

Ce projet démontre l'application d'algorithmes de **Machine Learning non supervisé** sur des données de mobilité urbaine réelles, en couvrant l'intégralité du pipeline Data Science :

```
Simulation → Collecte → Feature Engineering → Clustering → Visualisation → Analyse comparative
```

---

## 🏗️ Architecture générale

```
SUMOCasa v3
├── backend/                  # API FastAPI + pipeline analytics
│   ├── main.py               # Routes REST (simulation + analytics)
│   ├── simulation.py         # Thread SUMO/TraCI + state management
│   ├── config.py             # Variables d'environnement centralisées
│   ├── db.py                 # Connexion MongoDB + collections
│   ├── analytics/            # Pipeline ML (6 algorithmes)
│   │   ├── runner.py         # Orchestrateur pipeline
│   │   ├── compute_features.py
│   │   ├── kmeans.py
│   │   ├── dbscan.py
│   │   ├── hdbscan.py
│   │   ├── spectral.py
│   │   ├── st_dbscan.py
│   │   └── traclus.py
│   └── requirements.txt
├── frontend/                 # React + Vite SPA
│   └── src/
│       ├── App.jsx           # Racine — SimulationContext
│       ├── context/
│       │   └── SimulationContext.jsx  # État global partagé
│       ├── hooks/
│       │   ├── useSimulation.js       # Polling live + FPS dynamique
│       │   └── useAnalysis.js         # Polling pipeline analytics
│       ├── components/
│       │   ├── Header.jsx             # Topbar principale
│       │   ├── AlgoSidebar.jsx        # Sélecteur algorithmes
│       │   ├── MapView.jsx            # Carte Leaflet + layers
│       │   ├── MongoSummaryBar.jsx    # Barre état MongoDB
│       │   ├── AnalysisPage.jsx       # Page analyse dédiée
│       │   ├── Constants.js           # Config algos + palettes
│       │   ├── layers/                # Rendu spécialisé par algo
│       │   └── panels/                # StatsPanel, GraphePanel…
│       └── index.css                 # Design system complet
└── sumo/
    ├── casablanca.net.xml    # Réseau OSM Casablanca
    └── simulation.sumocfg   # Configuration SUMO
```

---

## 🧠 Algorithmes de clustering implémentés

| Algorithme | Cas d'usage trafic | Référence |
|---|---|---|
| **K-Means** | Zones géographiques homogènes | Lloyd, 1982 |
| **DBSCAN** | Détection de congestions et anomalies | Ester et al., 1996 |
| **HDBSCAN** | Hiérarchique — boulevards vs zones résidentielles | Campello et al., 2013 |
| **Spectral** | Connectivité topologique du réseau | Ng, Jordan & Weiss, 2002 |
| **ST-DBSCAN** | Propagation spatio-temporelle des bouchons | Birant & Kut, 2007 |
| **TRACLUS** | Patterns de flux récurrents (segments MDL) | Lee, Han & Whang, 2007 |

### Pipeline d'exécution

```
Stop simulation
    │
    ▼
compute_features   ← vitesse moyenne, sinuosité, zone départ/arrivée
    │
    ├──▶ kmeans
    ├──▶ dbscan
    ├──▶ hdbscan        (parallèle via threading)
    ├──▶ spectral
    ├──▶ st_dbscan
    └──▶ traclus
```

Chaque étape persiste ses résultats dans MongoDB (collections séparées par algorithme) et met à jour `analysis_steps[algo].status` pour le polling frontend.

---

## 🚀 Installation & Démarrage

### Prérequis

| Outil | Version | Lien |
|---|---|---|
| **SUMO** | ≥ 1.18 | [eclipse.dev/sumo](https://eclipse.dev/sumo/) |
| **MongoDB** | ≥ 6.0 | Port 27017 par défaut |
| **Python** | ≥ 3.10 | |
| **Node.js** | ≥ 18 | |

### Variables d'environnement (backend/.env)

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/
MONGO_DB=sumo_project

# SUMO (Windows example)
SUMO_HOME=C:\Program Files\Eclipse\Sumo

# Simulation defaults
DEFAULT_N_VEHICLES=50
DEFAULT_STEP_DELAY=0.5
CLUSTER_EVERY_N_STEPS=6
```

### Installation

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Lancement

```bash
# Terminal 1 — Backend FastAPI
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend Vite
cd frontend
npm run dev
```

Application disponible sur **http://localhost:5173**  
API Swagger sur **http://localhost:8000/docs**

---

## 🖥️ Guide d'utilisation

### 1. Simulation live

1. Choisissez un algorithme dans la **sidebar gauche**
2. Définissez le nombre de véhicules (10–500) dans la topbar
3. Cliquez **▶** pour démarrer
4. Observez les véhicules en temps réel sur la **carte gauche** (brute) et la **carte droite** (clustering live)
5. Le FPS dynamique s'affiche dans la topbar

### 2. Analyse post-simulation

1. Cliquez **■** pour arrêter la simulation
2. Le pipeline analytics se déclenche automatiquement en arrière-plan
3. La barre MongoDB affiche la progression de chaque étape
4. Une fois terminé, l'interface bascule automatiquement en mode **PANEL**
5. Cliquez **▲ ANALYSE** pour accéder à la page d'analyse complète

### 3. Page d'analyse

- **Vue comparative** : tous les algorithmes côte à côte
- **Métriques** : silhouette, inertia, noise count, etc.
- **Graphes** : répartition des clusters, sparklines temporelles
- **Navigation** : retour à la simulation via **← RETOUR**

---

## 📡 API Reference

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Santé du serveur + état MongoDB |
| `POST` | `/start?n_vehicles=50&step_delay=0.5` | Démarrer la simulation |
| `POST` | `/pause` | Pause / reprise |
| `POST` | `/stop` | Arrêt + déclenchement pipeline |
| `GET` | `/state` | État live (véhicules, step, trails) |
| `GET` | `/stats` | Statistiques courantes |
| `GET` | `/clustering` | Clustering live en cours |
| `GET` | `/analysis/status/{run_id}` | Avancement pipeline |
| `GET` | `/analysis/{algo}/{run_id}` | Résultats d'un algo |
| `GET` | `/analysis/traclus/{run_id}` | Résultats TRACLUS |
| `GET` | `/mongo/runs` | Historique des runs |

---

## 🔧 Choix techniques justifiés

### Backend
- **FastAPI** : typage strict, async natif, Swagger auto-généré
- **MongoDB** : schéma flexible adapté aux trajectoires variables, indexation géospatiale
- **Threading** : pipeline analytics non-bloquant (la simulation peut redémarrer immédiatement)
- **TraCI** : API officielle SUMO, contrôle fin à chaque pas de temps

### Frontend
- **React + Vite** : HMR instantané, build optimisé
- **SimulationContext** : état global partagé sans prop drilling
- **Leaflet + CARTO dark tiles** : rendu cartographique haute performance
- **JetBrains Mono + Syne** : lisibilité code + impact visuel display

---

## 📊 Résultats typiques (50 véhicules, 300 steps)

| Algorithme | Clusters | Bruit | Silhouette | Temps (s) |
|---|---|---|---|---|
| K-Means | 4–6 | 0 | 0.65–0.78 | < 1 |
| DBSCAN | 3–8 | 5–15% | 0.55–0.70 | < 1 |
| HDBSCAN | 4–10 | 8–20% | 0.58–0.72 | 1–3 |
| Spectral | 4–6 | 0 | 0.60–0.75 | 5–15 |
| ST-DBSCAN | 2–6 | 10–25% | 0.50–0.65 | 2–5 |
| TRACLUS | 3–8 traj. | — | — | 10–30 |

---

## 👨‍💻 Stack complète

```
Python 3.10+ · FastAPI · Motor (async MongoDB) · PyMongo
scikit-learn · hdbscan · numpy · pandas
SUMO 1.18+ · TraCI · sumolib
React 18 · Vite · Leaflet · React-Leaflet · Axios
JetBrains Mono · Syne (Google Fonts)
```
