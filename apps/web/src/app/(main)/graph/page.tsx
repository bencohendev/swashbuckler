'use client'

import { GraphView } from '@/features/graph'
import { SectionErrorBoundary } from '@/shared/components/SectionErrorBoundary'

export default function GraphPage() {
  return (
    <div className="absolute inset-0">
      <SectionErrorBoundary fallbackLabel="Graph view">
        <GraphView />
      </SectionErrorBoundary>
    </div>
  )
}
