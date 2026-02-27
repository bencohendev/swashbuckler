'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from './ui/Button'

interface SectionErrorBoundaryProps {
  children: ReactNode
  fallbackLabel?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const label = this.props.fallbackLabel ?? 'This section'
      return (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <AlertTriangleIcon className="size-8 text-destructive" />
          <p className="text-sm text-destructive">
            {label} encountered an error.
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCwIcon className="size-4" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
