// Color palette: 0=transparent, 4=brown(pole/wood), 5=gold, 6=dark gold, 8=dark brown(outline)
const PALETTE: Record<number, string> = {
  0: "transparent",
  4: "#8B5E3C",
  5: "#FFD700",
  6: "#B8860B",
  8: "#5D3A1A",
}

// 14 rows x 32 columns — treasure chest on sand with pole entering ground
// prettier-ignore
const PIXEL_ART: number[][] = [
  // Chest lid (narrower = tilted-back perspective)
  [4,4,0,0,0,0,0,0,8,8,8,8,8,8,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,0,0,0,0,0,8,4,4,4,4,4,4,4,4,4,4,8,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Opening with gold visible
  [4,4,0,0,0,0,8,5,5,5,5,5,5,5,5,5,5,5,5,8,0,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,0,0,0,0,8,6,5,6,5,5,6,5,5,6,5,6,5,8,0,0,0,0,0,0,0,0,0,0,0,0],
  // Front panel
  [4,4,0,0,0,0,8,8,8,8,8,8,8,8,8,8,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,0,0,0,0,8,4,4,4,4,4,4,4,4,4,4,4,4,8,0,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,0,0,0,0,8,4,4,4,4,8,6,6,8,4,4,4,4,8,0,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,0,0,0,0,8,4,4,4,4,4,4,4,4,4,4,4,4,8,0,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,0,0,0,0,8,8,8,8,8,8,8,8,8,8,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0],
  // Scattered coins on sand
  [4,4,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,5,0,0,6,0,0,0,0,0,0,0,0,0],
  // Pole fading into sand
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // Sand (transparent — section bg shows through)
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

const COLS = PIXEL_ART[0].length

export function PixelBeachScene() {
  // Transpose rows×cols into cols×rows for column-based rendering
  const columns: number[][] = []
  for (let c = 0; c < COLS; c++) {
    const col: number[] = []
    for (let r = 0; r < PIXEL_ART.length; r++) {
      col.push(PIXEL_ART[r][c])
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
