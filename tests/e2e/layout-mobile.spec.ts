import { test, expect } from '@playwright/test'

test.describe('mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('roots-atlas-locale', 'en-GB')
    })
  })

  test('hamburger opens family navigation', async ({ page }) => {
    await page.goto('/families/aguilar')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('link', { name: 'People' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Health' })).toBeVisible()
  })

  test('people page toolbar fits narrow viewport', async ({ page }) => {
    await page.goto('/families/aguilar/people')
    await page.getByRole('button', { name: /Search & filters/i }).click()
    const search = page.getByRole('textbox', { name: 'Search names, places, and notes' })
    const sort = page.getByRole('combobox', { name: 'Sort people' })
    await expect(search).toBeVisible({ timeout: 60_000 })
    await expect(sort).toBeVisible()
    const searchBox = await search.boundingBox()
    const sortBox = await sort.boundingBox()
    expect(searchBox).toBeTruthy()
    expect(sortBox).toBeTruthy()
    expect(searchBox!.width).toBeLessThanOrEqual(390)
    expect(sortBox!.width).toBeLessThanOrEqual(390)
  })
})
