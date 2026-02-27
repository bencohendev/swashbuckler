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
}

const COLS = 80
const ROWS = 24

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

// Tall palm tree — 13 wide x 14 tall, trunk at col 6
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

/** Dune height in rows from the bottom — two Gaussian peaks with gentle ripple */
function duneHeight(c: number): number {
  const peak1 = 3.5 * Math.exp(-((c - 18) ** 2) / 180)
  const peak2 = 4.0 * Math.exp(-((c - 62) ** 2) / 200)
  const ripple = 0.6 * Math.sin(c * 0.4)
  return Math.max(3, Math.min(10, Math.round(3.5 + peak1 + peak2 + ripple)))
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

function buildScene(): number[][] {
  const grid: number[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(0),
  )

  // Fill dunes — highlight on the crest row, solid sand below
  for (let c = 0; c < COLS; c++) {
    const h = duneHeight(c)
    for (let d = 0; d < h; d++) {
      const r = ROWS - 1 - d
      grid[r][c] = d === h - 1 ? 7 : 9
    }
  }

  // Flagpole (cols 0-1, from top down to sand surface)
  const poleSurface = ROWS - duneHeight(0)
  for (let r = 0; r <= poleSurface; r++) {
    grid[r][0] = 4
    grid[r][1] = 4
  }

  // Small palm tree — sprite col 4 is the trunk
  const tree1Col = 11
  const tree1Ground = ROWS - duneHeight(tree1Col + 4) + 1
  stamp(grid, PALM_SMALL, tree1Col, tree1Ground)

  // Tall palm tree — sprite col 6 is the trunk
  const tree2Col = 54
  const tree2Ground = ROWS - duneHeight(tree2Col + 6) + 1
  stamp(grid, PALM_TALL, tree2Col, tree2Ground)

  // Treasure chest — center of sprite (~col 6)
  const chestCol = 33
  const chestGround = ROWS - duneHeight(chestCol + 6) + 1
  stamp(grid, CHEST, chestCol, chestGround)

  // Scatter gold coins on the sand surface (deterministic positions)
  const coinPositions: [number, number][] = [
    [8, 5],
    [22, 6],
    [28, 5],
    [46, 6],
    [50, 5],
    [70, 6],
    [74, 5],
  ]
  for (const [cc, color] of coinPositions) {
    if (cc < COLS) {
      const surface = ROWS - duneHeight(cc)
      if (surface > 0 && grid[surface - 1][cc] === 0) {
        grid[surface - 1][cc] = color
      }
    }
  }

  return grid
}

// Compute scene once at module level
const SCENE = buildScene()

export function PixelBeachScene() {
  // Transpose rows x cols into cols x rows for column-based rendering
  const columns: number[][] = []
  for (let c = 0; c < COLS; c++) {
    const col: number[] = []
    for (let r = 0; r < ROWS; r++) {
      col.push(SCENE[r][c])
    }
    columns.push(col)
  }

  return (
    <div className="flex items-start">
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
