import {
  test,
  expect,
  createEntryWithTitle,
  openMoreMenu,
  saveAsTemplate,
  waitForToast,
} from './helpers'

test.describe('Templates — regression tests', () => {
  test('save entry as template', async ({ guestPage: page }) => {
    await createEntryWithTitle(page, 'Template Source')
    await page.waitForTimeout(1000)

    await saveAsTemplate(page, 'My Template')

    // Toast confirms save
    await waitForToast(page, 'Template "My Template" saved')
  })

  test('template in settings list', async ({ guestPage: page }) => {
    // Create an entry and save as template
    await createEntryWithTitle(page, 'Listed Template Source')
    await page.waitForTimeout(1000)
    await saveAsTemplate(page, 'Listed Template')
    await page.waitForTimeout(500)

    // Navigate to settings/templates
    await page.goto('/settings/templates', { waitUntil: 'domcontentloaded' })

    // Template name should be visible as a heading in the template card
    await expect(
      page.getByRole('heading', { name: 'Listed Template', exact: true }),
    ).toBeVisible({ timeout: 10000 })
  })

  test('templates page empty state', async ({ guestPage: page }) => {
    await page.goto('/settings/templates', { waitUntil: 'domcontentloaded' })

    await expect(
      page.getByText('No templates yet'),
    ).toBeVisible({ timeout: 10000 })
  })

  test('delete template from settings', async ({ guestPage: page }) => {
    // Create a template first
    await createEntryWithTitle(page, 'Delete Template Source')
    await page.waitForTimeout(1500) // Extra wait for save under load
    await saveAsTemplate(page, 'Deletable Template')
    // Wait for the toast to confirm the template was saved
    await expect(page.getByText('Template "Deletable Template" saved').first()).toBeVisible({
      timeout: 5000,
    })
    await page.waitForTimeout(500)

    // Go to templates settings
    await page.goto('/settings/templates', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', { name: 'Deletable Template' }),
    ).toBeVisible({ timeout: 15000 })

    // Open the template card "..." menu — find the "..." button near the template name
    const templateCard = page.locator('div').filter({
      has: page.getByRole('heading', { name: 'Deletable Template' }),
    }).first()
    const menuBtn = templateCard.locator('button').filter({ has: page.locator('svg') }).last()
    await menuBtn.click()

    // Click "Delete Permanently"
    const deleteItem = page.getByRole('menuitem', { name: /delete permanently/i })
    await deleteItem.click()

    // Confirm in the confirmation dialog
    const confirmBtn = page.getByRole('button', { name: /delete/i }).last()
    await confirmBtn.click()

    // Template should be gone — either removed from list or empty state shown
    // Use heading locator to avoid matching the toast message "Template ... deleted"
    await expect(
      page.getByRole('heading', { name: 'Deletable Template' }),
    ).not.toBeVisible({ timeout: 5000 })
  })

  test('apply template to entry', async ({ guestPage: page }) => {
    // Create a source entry with some content and save as template
    await createEntryWithTitle(page, 'Apply Source')
    await page.waitForTimeout(500)

    const editor = page.locator('[data-slate-editor="true"]')
    await editor.click()
    await page.keyboard.type('Template content here')
    await page.waitForTimeout(1000)

    await saveAsTemplate(page, 'Apply Me')
    await page.waitForTimeout(500)

    // Create a new target entry — wait for sidebar to be ready
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.locator('aside, nav').first().waitFor({ state: 'visible', timeout: 10000 })
    await page.waitForTimeout(500)
    await createEntryWithTitle(page, 'Target Entry')
    await page.waitForTimeout(500)

    // Open More options → Apply Template
    await openMoreMenu(page)
    const applyItem = page.getByRole('menuitem', { name: 'Apply Template' })
    await applyItem.click()

    // Wait for the template list dialog
    const templateList = page.locator('[role="listbox"][aria-label="Templates"]')
    await expect(templateList).toBeVisible({ timeout: 5000 })

    // Select the template
    const templateOption = templateList.getByRole('option').filter({ hasText: 'Apply Me' })
    await templateOption.click()

    // Should show content mode selection — click "Replace" radio (default) then Apply
    const applyBtn = page.locator('button[type="submit"]').filter({ hasText: 'Apply' })
    await applyBtn.click()

    // Toast confirms application
    await waitForToast(page, 'Template applied')
  })
})
