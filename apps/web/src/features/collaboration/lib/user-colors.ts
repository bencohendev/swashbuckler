// 12-color palette with good contrast for cursor overlays
const COLORS = [
  '#E06C75', // red
  '#61AFEF', // blue
  '#98C379', // green
  '#E5C07B', // yellow
  '#C678DD', // purple
  '#56B6C2', // cyan
  '#D19A66', // orange
  '#BE5046', // dark red
  '#7EC8E3', // light blue
  '#B8BB26', // lime
  '#FF79C6', // pink
  '#8BE9FD', // aqua
] as const

/**
 * Deterministic color from a user ID string.
 * Same user always gets the same color.
 */
export function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}
