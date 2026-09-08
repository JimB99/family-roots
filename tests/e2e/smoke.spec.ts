import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('roots-atlas-locale', 'en-GB')
  })
})

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Family trees' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in to create one' })).toBeVisible()
})
