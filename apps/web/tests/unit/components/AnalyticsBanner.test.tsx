import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '../../utils/render'
import userEvent from '@testing-library/user-event'
import { AnalyticsProvider, ANALYTICS_CONSENT_KEY } from '@/shared/components/AnalyticsBanner'
import { AnalyticsConsentToggle } from '@/features/onboarding/components/AnalyticsConsentToggle'

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}))

vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="vercel-speed-insights" />,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe('AnalyticsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('does not render analytics when no consent is stored', () => {
    render(<AnalyticsProvider />)

    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument()
    expect(screen.queryByTestId('vercel-speed-insights')).not.toBeInTheDocument()
  })

  it('renders analytics when consent is accepted', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted')
    render(<AnalyticsProvider />)

    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument()
    expect(screen.getByTestId('vercel-speed-insights')).toBeInTheDocument()
  })

  it('does not render analytics when consent is declined', () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'declined')
    render(<AnalyticsProvider />)

    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument()
    expect(screen.queryByTestId('vercel-speed-insights')).not.toBeInTheDocument()
  })
})

describe('AnalyticsConsentToggle', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders a checkbox defaulting to unchecked', () => {
    render(<AnalyticsConsentToggle />)

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('stores accepted on check', async () => {
    const user = userEvent.setup()
    render(<AnalyticsConsentToggle />)

    await user.click(screen.getByRole('checkbox'))

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('accepted')
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('stores declined on uncheck', async () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, 'accepted')
    const user = userEvent.setup()
    render(<AnalyticsConsentToggle />)

    expect(screen.getByRole('checkbox')).toBeChecked()

    await user.click(screen.getByRole('checkbox'))

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe('declined')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('includes a link to the privacy policy', () => {
    render(<AnalyticsConsentToggle />)

    const link = screen.getByRole('link', { name: /privacy policy/i })
    expect(link).toHaveAttribute('href', '/privacy')
  })
})
