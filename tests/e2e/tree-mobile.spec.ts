import { test, expect } from '@playwright/test'

test.describe('mobile tree interactions', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('roots-atlas-locale', 'en-GB')
    })
  })

  async function waitForCanvas(page: import('@playwright/test').Page) {
    const canvas = page.getByRole('application', { name: /Family tree canvas/i })
    await expect(canvas).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('Laying out tree…')).toHaveCount(0)
    return canvas
  }

  test('tap person shows selection bar without opening details sheet', async ({ page }) => {
    await page.goto('/families/aguilar')
    await waitForCanvas(page)
    await page.locator('[data-person-id]').first().click()
    await expect(page.getByTestId('tree-selection-bar')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Details' })).toHaveCount(0)
  })

  test('details button opens sheet and closing keeps selection', async ({ page }) => {
    await page.goto('/families/aguilar')
    await waitForCanvas(page)
    await page.locator('[data-person-id]').first().click()
    await page.getByRole('button', { name: 'Details' }).click()
    await expect(page.getByRole('dialog', { name: 'Details' })).toBeVisible()
    await page.getByRole('button', { name: 'Close panel' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Details' })).toHaveCount(0)
    await expect(page.getByTestId('tree-selection-bar')).toBeVisible()
  })

  test('panning the canvas updates the transform', async ({ page }) => {
    await page.goto('/families/aguilar')
    const canvas = await waitForCanvas(page)
    const scene = canvas.locator('svg > g').first()
    const before = await scene.getAttribute('transform')
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.move(box!.x + 40, box!.y + 40)
    await page.mouse.down()
    await page.mouse.move(box!.x + 140, box!.y + 140)
    await page.mouse.up()
    const after = await scene.getAttribute('transform')
    expect(after).not.toBe(before)
  })

  test('toolbar search and edit do not overlap', async ({ page }) => {
    await page.goto('/families/aguilar')
    await waitForCanvas(page)
    const search = page.getByRole('textbox', { name: 'Search people' })
    const edit = page.getByRole('button', { name: 'Edit' })
    if (await edit.isVisible()) {
      const searchBox = await search.boundingBox()
      const editBox = await edit.boundingBox()
      expect(searchBox).toBeTruthy()
      expect(editBox).toBeTruthy()
      const overlaps =
        searchBox!.x < editBox!.x + editBox!.width &&
        searchBox!.x + searchBox!.width > editBox!.x &&
        searchBox!.y < editBox!.y + editBox!.height &&
        searchBox!.y + searchBox!.height > editBox!.y
      expect(overlaps).toBe(false)
    }
  })
})
