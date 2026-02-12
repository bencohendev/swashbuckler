# Graph

**Status: Done**

## Overview

Force-directed knowledge graph visualization using D3.js, with type filtering, node selection, and color-coded nodes.

## Decisions

| Area | Decision |
|------|----------|
| Layout | D3 force-directed simulation |
| Rendering | Canvas-based (not SVG) |
| Interactions | Click to select, double-click to navigate, zoom/pan |
| Filtering | Inclusion-based type filter (click to include) |
| Node color | Deterministic palette per type, with swatches in filter panel |
| Node labels | Plural type names |

## Implementation

- `src/features/graph/components/GraphView.tsx` — main graph view
- `src/features/graph/components/GraphCanvas.tsx` — canvas rendering
- `src/features/graph/components/GraphFilterPanel.tsx` — type inclusion filter with color swatches
- `src/features/graph/components/GraphNodeDetail.tsx` — node selection detail panel
- `src/features/graph/lib/useForceSimulation.ts` — D3 force simulation
- `src/features/graph/lib/buildGraphData.ts` — graph data construction
- `src/features/graph/lib/colors.ts` — deterministic color palette
- `src/features/graph/lib/store.ts` — graph state (Zustand)
- `src/app/(main)/graph/page.tsx` — graph page

## Verification

- [x] All entries appear as nodes
- [x] Relations appear as edges
- [x] Click to select node with dimming
- [x] Double-click navigates to entry
- [x] Type filter works (inclusion mode)
- [x] Zoom/pan works
- [x] Nodes color-coded by type
- [ ] Search with highlighting
