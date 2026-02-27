// Color palette
const PALETTE: Record<number, string> = {
  0: "transparent",
  1: "#1B5E20", // dark green (leaf shadow)
  2: "#2E7D32", // green (main leaf)
  3: "#43A047", // light green (leaf highlight)
  4: "#8B5E3C", // brown (flagpole)
  5: "#FFD700", // gold
  6: "#B8860B", // dark gold / coconut
  7: "#D4B870", // sand highlight (dune crest)
  8: "#5D3A1A", // dark brown (trunk/outline)
  9: "#C4A055", // sand body
  10: "#1B5A82", // water body
  11: "#2E86B4", // wave / light water
  12: "#7EC4DE", // foam / wave crest
}

const COLS = 80
const ROWS = 24
const WATER_DEPTH = 6
const WATER_SURFACE = ROWS - WATER_DEPTH // row 18

// Small palm tree — 9 wide x 10 tall, trunk at col 4
// prettier-ignore
const PALM_SMALL = [
  [0,0,0,2,2,2,0,0,0],
  [0,3,2,2,1,2,2,3,0],
  [3,2,1,2,2,2,1,2,3],
  [0,3,0,6,8,6,0,3,0],
  [0,0,0,0,8,0,0,0,0],
  [0,0,0,0,8,0,0,0,0],
  [0,0,0,0,8,0,0,0,0],
  [0,0,0,0,8,0,0,0,0],
  [0,0,0,0,8,0,0,0,0],
  [0,0,0,0,8,0,0,0,0],
]

// Tall palm tree — 13 wide x 12 tall, trunk at col 6
// prettier-ignore
const PALM_TALL = [
  [0,0,0,0,0,2,2,2,0,0,0,0,0],
  [0,0,3,0,2,2,1,2,2,0,3,0,0],
  [0,3,2,2,1,2,2,2,1,2,2,3,0],
  [3,2,1,2,2,2,2,2,2,2,1,2,3],
  [0,3,0,1,0,0,8,0,0,1,0,3,0],
  [0,0,3,0,0,6,8,6,0,0,3,0,0],
  [0,0,0,0,0,0,8,0,0,0,0,0,0],
  [0,0,0,0,0,0,8,0,0,0,0,0,0],
  [0,0,0,0,0,0,8,0,0,0,0,0,0],
  [0,0,0,0,0,0,8,0,0,0,0,0,0],
  [0,0,0,0,0,0,8,0,0,0,0,0,0],
  [0,0,0,0,0,0,8,0,0,0,0,0,0],
]

// Treasure chest — 13 wide x 9 tall
// prettier-ignore
const CHEST = [
  [0,0,8,8,8,8,8,8,8,8,8,0,0],
  [0,8,4,4,4,4,4,4,4,4,4,8,0],
  [0,8,5,5,5,5,5,5,5,5,5,8,0],
  [0,8,6,5,6,5,5,6,5,6,5,8,0],
  [0,8,8,8,8,8,8,8,8,8,8,8,0],
  [0,8,4,4,4,4,4,4,4,4,4,8,0],
  [0,8,4,4,4,8,6,8,4,4,4,8,0],
  [0,8,4,4,4,4,4,4,4,4,4,8,0],
  [0,8,8,8,8,8,8,8,8,8,8,8,0],
]

/** Island sand height — land tapers off on both sides into ocean */
function islandHeight(c: number): number {
  const leftTaper = c <= 10 ? Math.max(0, c / 10) : 1
  const rightTaper = c <= 55 ? 1 : Math.max(0, 1 - (c - 55) / 16)
  const envelope = Math.min(leftTaper, rightTaper)
  const peak1 = 3.0 * Math.exp(-((c - 20) ** 2) / 180)
  const peak2 = 2.5 * Math.exp(-((c - 50) ** 2) / 200)
  const ripple = 0.5 * Math.sin(c * 0.4)
  const base = 5
  return Math.max(0, Math.round((base + peak1 + peak2 + ripple) * envelope))
}

/** Stamp a sprite onto the grid so its bottom row sits at groundRow */
function stamp(
  grid: number[][],
  sprite: number[][],
  col: number,
  groundRow: number,
) {
  for (let sr = 0; sr < sprite.length; sr++) {
    for (let sc = 0; sc < sprite[sr].length; sc++) {
      const gr = groundRow - sprite.length + 1 + sr
      const gc = col + sc
      if (
        gr >= 0 &&
        gr < ROWS &&
        gc >= 0 &&
        gc < COLS &&
        sprite[sr][sc] !== 0
      ) {
        grid[gr][gc] = sprite[sr][sc]
      }
    }
  }
}

const POLE_COL = 2

function buildScene(includePole: boolean): number[][] {
  const grid: number[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(0),
  )

  // 1. Fill ocean water
  for (let c = 0; c < COLS; c++) {
    for (let r = WATER_SURFACE; r < ROWS; r++) {
      const depth = r - WATER_SURFACE
      if (depth === 0) {
        // Wave surface — irregular foam/wave pattern
        grid[r][c] = Math.sin(c * 0.7 + 0.3) > -0.2 ? 12 : 11
      } else if (depth === 1) {
        grid[r][c] = Math.sin(c * 0.5 + 1) > 0 ? 12 : 11
      } else if (depth <= 3) {
        grid[r][c] = 11
      } else {
        grid[r][c] = 10
      }
    }

    // Wave peaks above the surface line (only where no sand)
    const ih = islandHeight(c)
    if (ih === 0 && Math.sin(c * 0.6) > 0.5) {
      grid[WATER_SURFACE - 1][c] = 12
    }
  }

  // 2. Fill sand island (overwrites water at the shoreline)
  for (let c = 0; c < COLS; c++) {
    const h = islandHeight(c)
    if (h > 0) {
      const sandTop = WATER_SURFACE - h
      for (let r = sandTop; r <= WATER_SURFACE; r++) {
        grid[r][c] = r === sandTop ? 7 : 9
      }
    }
  }

  // 3. Flagpole (desktop only)
  if (includePole) {
    const poleSandTop = WATER_SURFACE - islandHeight(POLE_COL)
    for (let r = 0; r <= poleSandTop; r++) {
      grid[r][POLE_COL] = 4
      grid[r][POLE_COL + 1] = 4
    }
  }

  // 4. Stamp sprites
  const tree1Col = 11
  const tree1Ground = WATER_SURFACE - islandHeight(tree1Col + 4) + 1
  stamp(grid, PALM_SMALL, tree1Col, tree1Ground)

  const tree2Col = 42
  const tree2Ground = WATER_SURFACE - islandHeight(tree2Col + 6) + 1
  stamp(grid, PALM_TALL, tree2Col, tree2Ground)

  const chestCol = 26
  const chestGround = WATER_SURFACE - islandHeight(chestCol + 6) + 1
  stamp(grid, CHEST, chestCol, chestGround)

  // 5. Scatter coins on sand
  const coinPositions: [number, number][] = [
    [7, 5],
    [22, 6],
    [38, 5],
    [56, 6],
  ]
  for (const [cc, color] of coinPositions) {
    if (cc < COLS) {
      const h = islandHeight(cc)
      if (h > 0) {
        const surface = WATER_SURFACE - h
        if (surface > 0 && grid[surface - 1][cc] === 0) {
          grid[surface - 1][cc] = color
        }
      }
    }
  }

  return grid
}

// Compute both scenes once at module level
const SCENE_NO_POLE = buildScene(false)
const SCENE_WITH_POLE = buildScene(true)

function transpose(scene: number[][]): number[][] {
  const columns: number[][] = []
  for (let c = 0; c < COLS; c++) {
    const col: number[] = []
    for (let r = 0; r < ROWS; r++) {
      col.push(scene[r][c])
    }
    columns.push(col)
  }
  return columns
}

const COLS_NO_POLE = transpose(SCENE_NO_POLE)
const COLS_WITH_POLE = transpose(SCENE_WITH_POLE)

function PixelGrid({
  columns,
  className,
}: {
  columns: number[][]
  className?: string
}) {
  return (
    <div className={`flex items-start ${className ?? ""}`}>
      {columns.map((col, colIdx) => (
        <div key={colIdx}>
          {col.map((colorIdx, rowIdx) => (
            <div
              key={rowIdx}
              className="size-[6px] sm:size-[8px]"
              style={{ backgroundColor: PALETTE[colorIdx] }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PixelBeachScene() {
  return (
    <>
      <PixelGrid columns={COLS_NO_POLE} className="sm:hidden" />
      <PixelGrid columns={COLS_WITH_POLE} className="hidden sm:flex" />
    </>
  )
}
