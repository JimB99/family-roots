import { chromium } from 'playwright'

const BASE = process.env.SHOT_BASE ?? 'http://localhost:4173'
const OUT = process.env.SHOT_OUT ?? 'shots'

const targets = [
  { name: 'tree-light', path: '/families/aguilar', theme: 'light', wait: 7000 },
  { name: 'tree-dark', path: '/families/aguilar', theme: 'dark', wait: 7000, zoom: 4 },
  { name: 'tree-mid-light', path: '/families/aguilar', theme: 'light', wait: 7000, zoom: 4 },
  { name: 'people-dark', path: '/families/aguilar/people', theme: 'dark', wait: 6000 },
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

for (const target of targets) {
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.addInitScript((theme) => {
    localStorage.setItem('roots-atlas-theme', theme)
  }, target.theme)
  await page.goto(`${BASE}${target.path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('header', { timeout: 15000 })
  await page.waitForTimeout(target.wait ?? 2500)
  if (target.zoom) {
    const canvas = await page.$('.tree-canvas')
    const box = await canvas.boundingBox()
    for (let i = 0; i < target.zoom; i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.wheel(0, -240)
      await page.waitForTimeout(120)
    }
    await page.waitForTimeout(800)
  }
  await page.screenshot({ path: `${OUT}/${target.name}.png` })
  if (errors.length) console.log(target.name, 'errors:', errors.slice(0, 5))
  await page.close()
}

await browser.close()
console.log('screenshots written to', OUT)
