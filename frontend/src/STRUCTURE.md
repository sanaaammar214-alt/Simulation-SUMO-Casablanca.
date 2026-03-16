# Frontend structure (SUMOCasa v2)

## Overview

- **`src/App.jsx`** – Root: hooks, global state, routing between main and analysis views. Composes `AppShell`, `Header`, and page components.
- **`src/pages/`** – Page-level components: `MainPage` (simulation + maps + bottom panel), `AnalysisPage` (re-exported from components).
- **`src/components/`** – Shared UI and feature components.
- **`src/constants/`** – Single source of truth for `ALGO_CONFIG`, `CLUSTER_PALETTES`, `NOISE_COLOR`.
- **`src/hooks/`** – `useSimulation`, `useAnalysisPipeline`.
- **`src/api/`** – API client.

## Reusable components

### `components/ui/` (primitives)

| Component       | Use case                                      |
|----------------|-----------------------------------------------|
| `Button`       | Actions (variants: primary, secondary, ghost, danger; sizes: sm, md, icon). |
| `Badge`        | Status/live/done chips, algo pills.          |
| `StatusDot`    | Small status indicator with optional label.   |
| `TabBar`       | Tab strips with accent color and active state.|
| `Card`         | Containers with optional left accent.        |
| `SectionHeader`| Panel section titles with optional right slot.|

### `components/layout/`

| Component     | Role |
|---------------|------|
| `AppShell`    | Full-viewport wrapper; sets `--algo-accent` / `--algo-glow` from active algo. |
| `MapSection`  | Map area: toolbar, split live/analysis maps, status bar, Mongo summary. |
| `BottomPanel` | Bottom tab bar (Analyse, Pipeline, Graphe, Bilan) + tab content. |

## Data flow

- **Constants**: Import from `./constants` (or legacy `./components/Constants` re-export).
- **App** owns: `activeAlgoId`, `activeTab`, `viewMode`, `page`, `showSplit`, `selectedCluster`, `startConfig`. Passes handlers and state into `Header`, `MainPage`, and `AnalysisPage`.
- **MainPage** receives all props needed for `AlgoSidebar`, `MapSection`, and `BottomPanel`; no local state.

## File map

```
src/
├── App.jsx
├── main.jsx
├── index.css
├── constants/
│   └── index.js          # ALGO_CONFIG, CLUSTER_PALETTES, NOISE_COLOR
├── pages/
│   ├── index.js          # re-exports MainPage, AnalysisPage
│   └── MainPage.jsx      # sidebar + MapSection + BottomPanel
├── components/
│   ├── Constants.js      # re-exports from ../constants (backward compat)
│   ├── Header.jsx
│   ├── AlgoSidebar.jsx
│   ├── MapView.jsx
│   ├── MongoSummaryBar.jsx
│   ├── AnalysisPage.jsx
│   ├── ui/
│   │   ├── index.js
│   │   ├── Button.jsx
│   │   ├── Badge.jsx
│   │   ├── StatusDot.jsx
│   │   ├── TabBar.jsx
│   │   ├── Card.jsx
│   │   └── SectionHeader.jsx
│   ├── layout/
│   │   ├── index.js
│   │   ├── AppShell.jsx
│   │   ├── MapSection.jsx
│   │   └── BottomPanel.jsx
│   ├── panels/           # StatsPanel, AnalysisPipelinePanel, etc.
│   └── layers/           # KMeansLayer, DBSCANLayer, ...
├── hooks/
└── api/
```
