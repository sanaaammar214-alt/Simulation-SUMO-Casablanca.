export const ALGO_CONFIG = {
  kmeans: {
    id: "kmeans", label: "K-Means", abbr: "KM", color: "#00d4ff", glow: "#00d4ff33",
    icon: "⬡", description: "Partitionnement Voronoï — zones géographiques homogènes",
    ref: "Lloyd, 1982",
    metrics: ["silhouette", "inertia", "k", "iter"]
  },
  dbscan: {
    id: "dbscan", label: "DBSCAN", abbr: "DB", color: "#ff6b35", glow: "#ff6b3533",
    icon: "◉", description: "Densité adaptative — détection de congestions et anomalies",
    ref: "Ester et al., 1996",
    metrics: ["clusters_count", "noise_count", "core_points", "eps_optimal"]
  },
  hdbscan: {
    id: "hdbscan", label: "HDBSCAN", abbr: "HDB", color: "#a78bfa", glow: "#a78bfa33",
    icon: "⬢", description: "Hiérarchique multi-densité — boulevards vs résidentiel",
    ref: "Campello et al., 2013",
    metrics: ["persistence", "stability", "clusters_count", "noise_count"]
  },
  stdbscan: {
    id: "stdbscan", label: "ST-DBSCAN", abbr: "STD", color: "#34d399", glow: "#34d39933",
    icon: "◈", description: "Spatio-temporel — propagation et déplacement des bouchons",
    ref: "Birant & Kut, 2007",
    metrics: ["moving_clusters", "avg_speed", "direction", "eps_spatial"]
  },
  spectral: {
    id: "spectral", label: "Spectral", abbr: "SP", color: "#60a5fa", glow: "#60a5fa33",
    icon: "〜", description: "Graphe Laplacien — connectivité topologique du réseau",
    ref: "Ng, Jordan & Weiss, 2002",
    metrics: ["eigengap", "connectivity", "corridors", "neighbors"]
  },
  traclus: {
    id: "traclus", label: "TRACLUS", abbr: "TR", color: "#fbbf24", glow: "#fbbf2433",
    icon: "→", description: "Sous-trajectoires — patterns de flux récurrents MDL",
    ref: "Lee, Han & Whang, 2007",
    metrics: ["rep_trajectories", "avg_segments", "coverage_pct", "partitions"]
  }
};

export const CLUSTER_PALETTES = {
  kmeans:   ["#ff4d6d", "#2ecc71", "#f1c40f", "#00bcd4"],
  dbscan:   ["#ff6b35", "#a78bfa", "#e879f9", "#555555"],
  hdbscan:  ["#a78bfa", "#f472b6", "#fb923c", "#6ee7b7", "#e879f9"],
  stdbscan: ["#34d399", "#fbbf24", "#f87171"],
  spectral: ["#60a5fa", "#f87171", "#4ade80", "#e2e8f0"],
  traclus:  ["#fbbf24", "#c084fc", "#6ee7b7", "#f87171"]
};

export const NOISE_COLOR = "#4a5568";
export const CLUSTER_COLORS = CLUSTER_PALETTES;
