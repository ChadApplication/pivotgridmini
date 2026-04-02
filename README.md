# PivotGrid Mini

A modern reimagination of Microsoft Silverlight PivotViewer, built with React + Vite + Tailwind CSS + Framer Motion.

## Current Version: v1.2.0

### What It Does

PivotGrid Mini visualizes collections of items as interactive, filterable card grids with two view modes:

- **Grid View** — Cards arranged in a responsive grid, auto-scaled to viewport
- **Stacked View** — Bar-chart style stacking by category or year, cards sized to fit viewport ceiling

### Features

| Feature | Description |
|---------|-------------|
| **Viewport-Aware Scaling** | Card size adapts to screen dimensions and item count using `sqrt(area * 0.8 / N)` |
| **Dynamic Stacked View** | Tallest stack auto-fits to viewport ceiling. Responds to browser zoom (67%~125%) |
| **Auto Multi-Column** | Stacks with 25+ items auto-split into 2/3/4 columns. All groups use same column count for fair height comparison |
| **3-Level Semantic Disclosure** | Large (full info), Medium (title + year), Small (image only, hover overlay) |
| **Faceted Navigation** | Category checkboxes + histogram range slider for publication year |
| **FLIP Animations** | Framer Motion `layoutId` for seamless transitions between grid, stacked, and detail views |
| **Detail Modal** | Click any card for full detail view with smooth layout animation |

## Strengths

1. **True PivotViewer experience** — The only modern open-source reimagination of Microsoft's PivotViewer concept
2. **Zero-scroll stacked view** — Bar chart fits within viewport without scrolling, dynamically adjusts to any zoom level
3. **Proportional multi-column** — When data exceeds 25 per group, all groups uniformly switch to N-column layout preserving accurate height comparison
4. **Smooth animations** — `layoutId` enables seamless card transitions between grid, stack, and modal views
5. **No backend required** — Pure client-side, deployable as static site

## Limitations

| Limitation | Description | Planned Solution |
|-----------|-------------|-----------------|
| **Scale ceiling ~500 items** | Beyond 500 items, card sizes become too small to identify. Multi-column helps but has limits | `scale/large` branch: Level 1 Overview with color bars |
| **No zoom interaction** | Cannot zoom into a stack to see individual cards larger | `scale/medium` branch: hover-to-expand stacks |
| **Random demo data** | Data regenerates on each reload (non-deterministic) | Seeded PRNG or static dataset |
| **No data import** | Hardcoded demo items only, no CSV/JSON import | Future: drag-and-drop data loading |
| **Single-item Q3 self-report** | External image dependency (picsum.photos) — broken images if offline | Fallback placeholder images |
| **No deep zoom** | Unlike original PivotViewer, no semantic zoom from overview to detail | `scale/large` branch |

## Architecture: 3-Level Zoom (Planned)

```
┌─────────────────────────────────────────────────────┐
│  Level 1 — Overview          [scale/large branch]   │
│  Color bars, height = count                         │
│  Handles 1,000 ~ 10,000+ items                      │
│  Click → drill down to Level 2                      │
├─────────────────────────────────────────────────────┤
│  Level 2 — Stack             [scale/medium branch]  │
│  Individual cards, overlap stacking                 │
│  25/col auto-split, multi-column                    │
│  Handles 200 ~ 500 items  ← CURRENT                │
│  Click card → Level 3                               │
├─────────────────────────────────────────────────────┤
│  Level 3 — Detail            [scale/small branch]   │
│  Full modal with image, metadata, description       │
│  Single item focus  ← CURRENT                       │
└─────────────────────────────────────────────────────┘
```

### Branch Status

| Branch | Level | Status | Data Scale |
|--------|-------|--------|-----------|
| `main` | 2 + 3 | Stable | ~200-500 items |
| `scale/small` | 3 (Detail) | Planned | Enhanced detail modal |
| `scale/medium` | 2 (Stack) | Planned | Hover-expand, 500+ optimization |
| `scale/large` | 1 (Overview) | Planned | Color bars, 1000+ items |

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 5 | Build tool |
| Tailwind CSS 3 | Styling |
| Framer Motion 11 | Layout animations |
| Lucide React | Icons |
| TypeScript | Type safety |

## Getting Started

```bash
npm install
npm run dev
```

Or via the project control script:

```bash
./run.sh start    # Start dev server
./run.sh stop     # Stop dev server
./run.sh status   # Check server status
```

## License

MIT

## Author

Chungil (Chad) Chae — Wenzhou-Kean University
