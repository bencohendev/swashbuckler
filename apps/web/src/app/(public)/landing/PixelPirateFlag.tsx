// Color palette: 0=transparent, 1=black(flag), 2=white(skull/bones), 3=grey(sword), 4=brown(pole/handles)
const PALETTE: Record<number, string> = {
  0: "transparent",
  1: "#1a1a1a",
  2: "#e8e8e8",
  3: "#9ca3af",
  4: "#8B5E3C",
}

// 24 rows x 32 columns — skull with crossed swords on black flag + flagpole
// prettier-ignore
const PIXEL_ART: number[][] = [
  // Pole top + flag start
  [4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [4,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  // Skull top
  [4,4,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,0],
  // Eyes
  [4,4,1,1,1,1,1,1,1,1,1,2,2,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,1,2,2,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,0],
  // Nose
  [4,4,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  // Teeth
  [4,4,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,1,1,2,1,2,1,2,1,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  // Crossed cutlasses — blade tips (white edge highlight + grey body, widening with curve)
  [4,4,1,1,2,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,2,1,1,1,0],
  [4,4,1,1,1,2,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,2,1,1,1,1,0],
  [4,4,1,1,1,1,2,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,2,1,1,1,1,1,0],
  // Blades at widest (4px) — cutlass belly
  [4,4,1,1,1,1,1,1,2,3,3,3,1,1,1,1,1,1,1,1,3,3,3,2,1,1,1,1,1,1,1,0],
  // Blades narrowing toward center
  [4,4,1,1,1,1,1,1,1,1,1,2,3,3,1,1,1,1,3,3,2,1,1,1,1,1,1,1,1,1,1,0],
  // Crossing point — blades overlap
  [4,4,1,1,1,1,1,1,1,1,1,1,2,3,3,3,3,3,3,2,1,1,1,1,1,1,1,1,1,1,1,0],
  // Hand guards (brown basket guards)
  [4,4,1,1,1,1,1,1,1,1,1,4,4,3,2,2,2,2,3,4,4,1,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1,1,0],
  // Handles (brown, diverging outward)
  [4,4,1,1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,1,1,1,1,1,4,4,1,1,1,1,1,1,1,0],
  // Pommels (wider handle ends)
  [4,4,1,1,1,1,1,4,4,4,1,1,1,1,1,1,1,1,1,1,1,1,4,4,4,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
]

const ROWS = PIXEL_ART.length
const COLS = PIXEL_ART[0].length
const POLE_COLS = 2

export function PixelPirateFlag() {
  // Transpose rows×cols into cols×rows for column-based rendering
  const columns: number[][] = []
  for (let c = 0; c < COLS; c++) {
    const col: number[] = []
    for (let r = 0; r < ROWS; r++) {
      col.push(PIXEL_ART[r][c])
    }
    columns.push(col)
  }

  return (
    <div className="flex justify-center mb-8" aria-hidden="true">
      <div className="flex items-start">
        {columns.map((col, colIdx) => {
          const isPole = colIdx < POLE_COLS
          return (
            <div
              key={colIdx}
              className={isPole ? undefined : "flag-wave-col"}
              style={
                isPole ? undefined : ({ "--col": colIdx - POLE_COLS } as React.CSSProperties)
              }
            >
              {col.map((colorIdx, rowIdx) => (
                <div
                  key={rowIdx}
                  className="size-[4px] sm:size-[6px]"
                  style={{ backgroundColor: PALETTE[colorIdx] }}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
