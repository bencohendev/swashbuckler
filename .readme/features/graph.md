# Graph

**Status:** Done

## Overview

Force-directed knowledge graph visualization using D3.js, with type filtering, node selection, color-coded nodes, and multiple layout modes.

## Decisions

| Area | Decision |
|------|----------|
| Layout | Four modes: force-directed, hierarchical (tree), radial, clustered (by type) |
| Rendering | SVG-based |
| Interactions | Click to select, drag to move, zoom/pan |
| Filtering | Inclusion-based type filter (click to include) |
| Node color | Deterministic palette per type, with swatches in filter panel |
| Node labels | Truncated object titles |
| Layout switching | Animated transitions between layouts (~400ms ease-out) |

## Layout Modes

- **Force** (default): D3 force simulation with link, charge, center, and collide forces. Nodes can be dragged with physics reheat.
- **Hierarchical**: BFS spanning tree rendered top-down via `d3.tree().nodeSize()`. Consistent spacing regardless of tree width.
- **Radial**: Same spanning tree projected onto concentric circles. Root at center, depth = radius.
- **Clustered**: Nodes grouped by type. Cluster centers on outer circle, nodes within each cluster on inner circles. Pure math, no simulation.

Disconnected components are handled via a virtual root node (not rendered) that joins multiple BFS trees. Cross-edges (not in spanning tree) are still rendered.

## Implementation

- `src/features/graph/components/GraphView.tsx` — main graph view
- `src/features/graph/components/GraphCanvas.tsx` — SVG canvas with pan/zoom and interaction
- `src/features/graph/components/GraphFilterPanel.tsx` — type inclusion filter with color swatches
- `src/features/graph/components/GraphNodeDetail.tsx` — node selection detail panel
- `src/features/graph/components/GraphLayoutToggle.tsx` — layout mode toggle (force/hierarchical/radial/clustered)
- `src/features/graph/lib/useForceSimulation.ts` — D3 force simulation
- `src/features/graph/lib/layouts/useGraphLayout.ts` — layout router hook with animated transitions
- `src/features/graph/lib/layouts/buildSpanningTree.ts` — BFS spanning tree for hierarchical/radial
- `src/features/graph/lib/layouts/hierarchicalLayout.ts` — top-down tree layout
- `src/features/graph/lib/layouts/radialLayout.ts` — radial tree layout
- `src/features/graph/lib/layouts/clusteredLayout.ts` — type-grouped circle layout
- `src/features/graph/lib/buildGraphData.ts` — graph data construction
- `src/features/graph/lib/colors.ts` — deterministic color palette
- `src/features/graph/lib/store.ts` — graph state (Zustand) including `layoutMode`
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
- [x] Switch between all 4 layout modes
- [x] Animated transitions between layouts
- [x] Node drag works in force (physics) and static (direct move) layouts
- [x] Disconnected graph components handled
