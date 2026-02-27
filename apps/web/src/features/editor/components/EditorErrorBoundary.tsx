'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/shared/components/ui/Button'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6" role="alert">
          <h3 className="mb-2 text-sm font-semibold text-destructive">Editor failed to load</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            The editor content may be corrupted. You can reset it to start fresh.
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            Reset editor
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
