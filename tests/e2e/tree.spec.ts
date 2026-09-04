import { test, expect } from '@playwright/test'

test.describe('family tree', () => {
  test('aguilar tree renders the canvas after load', async ({ page }) => {
    await page.goto('/families/aguilar')
    const canvas = page.getByRole('application', { name: /Family tree canvas/i })
    await expect(canvas).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
    await expect(page.getByText('Laying out tree…')).toHaveCount(0)
  })

  test('search filters people in the toolbar', async ({ page }) => {
    await page.goto('/families/aguilar')
    await expect(page.getByRole('application', { name: /Family tree canvas/i })).toBeVisible({
      timeout: 60_000,
    })
    const search = page.getByRole('textbox', { name: 'Search people' })
    await search.fill('zzz-no-match-xyz')
    await expect(page.getByText(/^\d+ people$/)).toBeVisible()
  })
})
