/**
 * Measures the cumulative height of visible private blocks above a given
 * content-relative y position. Used to normalize cursor coordinates between
 * owners (who see private blocks) and non-owners (who don't).
 *
 * Hidden blocks (non-owner, `display: none`) have zero height from
 * getBoundingClientRect, so this naturally returns 0 for non-owners.
 */
export function getPrivateBlockOffsetAbove(
  container: HTMLElement,
  y: number,
  scrollTop: number,
): number {
  const blocks = container.querySelectorAll<HTMLElement>('[data-private-block]')
  if (blocks.length === 0) return 0

  const containerTop = container.getBoundingClientRect().top
  let offset = 0

  for (const block of blocks) {
    const rect = block.getBoundingClientRect()
    if (rect.height === 0) continue

    const blockTop = rect.top - containerTop + scrollTop
    if (blockTop < y) {
      offset += rect.height
    }
  }

  return offset
}
