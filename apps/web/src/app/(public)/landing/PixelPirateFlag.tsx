// Color palette: 0=transparent, 1=black(flag), 2=white(skull/bones), 4=brown(pole)
const PALETTE: Record<number, string> = {
  0: "transparent",
  1: "#1a1a1a",
  2: "#e8e8e8",
  4: "#8B5E3C",
}

// 24 rows x 32 columns — skull and crossbones on black flag + flagpole
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
  // Crossed bones — upper knobs
  [4,4,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,0],
  [4,4,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,0],
  // Shafts approaching center
  [4,4,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  // Crossing
  [4,4,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  // Shafts diverging (bones have crossed)
  [4,4,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,0],
  [4,4,1,1,1,1,1,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1,1,1,1,1,1,0],
  // Lower knobs
  [4,4,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,0],
  [4,4,1,1,1,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,1,1,1,1,1,0],
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
