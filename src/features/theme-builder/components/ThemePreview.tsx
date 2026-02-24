'use client'

import type { ThemeResolvedColors } from '../types'

interface ThemePreviewProps {
  resolvedColors: ThemeResolvedColors
}

export function ThemePreview({ resolvedColors: c }: ThemePreviewProps) {
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ backgroundColor: c.background, color: c.foreground, borderColor: c.border }}
      role="img"
      aria-label="Theme preview"
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: c.sidebar, borderBottom: `1px solid ${c.border}` }}
      >
        <span className="text-sm font-semibold" style={{ color: c['sidebar-foreground'] }}>
          Preview
        </span>
        <div className="flex gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: c.destructive }} />
          <span className="size-2 rounded-full" style={{ backgroundColor: c.primary }} />
          <span className="size-2 rounded-full" style={{ backgroundColor: c.accent }} />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        <h3 className="text-sm font-semibold" style={{ color: c.foreground }}>
          Sample Heading
        </h3>
        <p className="text-xs" style={{ color: c['muted-foreground'] }}>
          This is muted foreground text on the background.
        </p>

        {/* Button row */}
        <div className="flex flex-wrap gap-2">
          <span
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: c.primary, color: c['primary-foreground'] }}
          >
            Primary
          </span>
          <span
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: c.secondary, color: c['secondary-foreground'] }}
          >
            Secondary
          </span>
          <span
            className="rounded-md px-3 py-1.5 text-xs font-medium"
            style={{ backgroundColor: c.destructive, color: c['destructive-foreground'] }}
          >
            Delete
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-md p-3"
          style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
        >
          <span className="text-xs font-medium" style={{ color: c['card-foreground'] }}>
            Card content
          </span>
        </div>

        {/* Chart color swatches */}
        <div className="flex gap-1.5">
          {(['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const).map(key => (
            <span
              key={key}
              className="h-3 flex-1 rounded-sm"
              style={{ backgroundColor: c[key] }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
