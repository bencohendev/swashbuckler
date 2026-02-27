import { axe, type AxeCore } from 'vitest-axe'

/**
 * Run axe-core on a rendered container with JSDOM-irrelevant rules disabled.
 * These rules require a full page context that JSDOM doesn't provide.
 */
export async function checkA11y(container: HTMLElement): Promise<AxeCore.AxeResults> {
  const results = await axe(container, {
    rules: {
      // These rules require full-page context unavailable in JSDOM
      region: { enabled: false },
      'document-title': { enabled: false },
      'html-has-lang': { enabled: false },
      'landmark-one-main': { enabled: false },
      'page-has-heading-one': { enabled: false },
    },
  })
  return results
}
