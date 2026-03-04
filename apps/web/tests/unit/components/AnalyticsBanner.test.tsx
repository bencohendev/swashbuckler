import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '../../utils/render'
import userEvent from '@testing-library/user-event'
import { AnalyticsBanner, ANALYTICS_CONSENT_KEY } from '@/shared/components/AnalyticsBanner'

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}))

vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Uses ANALYTICS_CONSENT_KEY imported from the component

describe('AnalyticsBanner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the banner when no consent is stored', () => {
    render(<AnalyticsBanner />)

    expect(screen.getByRole('region', { name: /analytics consent/i })).toBeInTheDocument()
    expect(screen.getByText(/anonymous analytics/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ok/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument()
  })

  it('renders Analytics and SpeedInsights by default', () => {
    render(<AnalyticsBanner />)

    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument()
    expect(screen.getByTestId('vercel-speed-insights')).toBeInTheDocument()
  })

  it('hides the banner and stores accepted on OK click', async () => {
    const user = userEvent.setup()
    render(<AnalyticsBanner />)

    await user.click(screen.getByRole('button', { name: /ok/i }))

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('accepted')
    expect(screen.getByRole('region', { name: /analytics consent/i })).toHaveClass('max-h-0', 'invisible')
  })

  it('keeps analytics enabled after accepting', async () => {
    const user = userEvent.setup()
    render(<AnalyticsBanner />)

    await user.click(screen.getByRole('button', { name: /ok/i }))

    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument()
    expect(screen.getByTestId('vercel-speed-insights')).toBeInTheDocument()
  })

  it('hides the banner and stores declined on Decline click', async () => {
    const user = userEvent.setup()
    render(<AnalyticsBanner />)

    await user.click(screen.getByRole('button', { name: /decline/i }))

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('declined')
    expect(screen.getByRole('region', { name: /analytics consent/i })).toHaveClass('max-h-0', 'invisible')
  })

  it('removes analytics components after declining', async () => {
    const user = userEvent.setup()
    render(<AnalyticsBanner />)

    await user.click(screen.getByRole('button', { name: /decline/i }))

    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument()
    expect(screen.queryByTestId('vercel-speed-insights')).not.toBeInTheDocument()
  })

  it('hides the banner when consent was previously accepted', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted')
    render(<AnalyticsBanner />)

    expect(screen.getByRole('region', { name: /analytics consent/i })).toHaveClass('max-h-0', 'invisible')
    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument()
  })

  it('hides the banner and analytics when consent was previously declined', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'declined')
    render(<AnalyticsBanner />)

    expect(screen.getByRole('region', { name: /analytics consent/i })).toHaveClass('max-h-0', 'invisible')
    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument()
    expect(screen.queryByTestId('vercel-speed-insights')).not.toBeInTheDocument()
  })

  it('includes a link to the privacy policy', () => {
    render(<AnalyticsBanner />)

    const link = screen.getByRole('link', { name: /privacy policy/i })
    expect(link).toHaveAttribute('href', '/privacy')
  })
})
