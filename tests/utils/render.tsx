import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'

type WrapperProps = {
  children: ReactNode
}

function AllProviders({ children }: WrapperProps) {
  // Add providers here as needed (e.g., AuthProvider, ThemeProvider)
  return <>{children}</>
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
