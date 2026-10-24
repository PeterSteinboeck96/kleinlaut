import { test, expect } from '@playwright/test'
import { modelLargeViewport } from './helpers/mobile-display.js'

test.use({ hasTouch: true, isMobile: true, locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({
    body: '', contentType: route.request().resourceType() === 'script' ? 'application/javascript' : 'text/plain',
  }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function modelScreen(page, display) {
  await page.addInitScript(display => {
    window.testScreen = display
    for (const dimension of ['width', 'height']) {
      Object.defineProperty(screen, dimension, { configurable: true, get: () => window.testScreen[dimension] })
    }
  }, display)
}

for (const display of [
  { width: 320, height: 480, large: 460 },
  { width: 320, height: 568, large: 548 },
  { width: 360, height: 800, large: 776 },
  { width: 390, height: 844, large: 797 },
  { width: 402, height: 874, large: 812 },
  { width: 430, height: 932, large: 873 },
]) {
  test(`hero ends at the browser edge, not the hardware edge, at ${display.width}×${display.height}`, async ({ page }) => {
    const viewport = { width: display.width, height: display.height - 150 }
    await page.setViewportSize(viewport)
    await modelScreen(page, display)
    await modelLargeViewport(page, display.large)
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)

    const header = await page.locator('header').boundingBox()
    const photo = await page.locator('.home-hero-background img').boundingBox()
    expect(photo.y).toBe(header.height)
    expect(photo.y + photo.height).toBeCloseTo(display.large, 0)
    expect((await page.locator('.home-map').boundingBox()).y).toBeCloseTo(display.large, 0)
    const contactTop = await page.locator('.home-contact').evaluate(el => el.getBoundingClientRect().top + scrollY)
    const logoTop = await page.locator('.home-logo').evaluate(el => el.getBoundingClientRect().top + scrollY)

    for (const height of [viewport.height + 50, display.large, viewport.height]) {
      await page.setViewportSize({ width: display.width, height })
      expect((await page.locator('.home-map').boundingBox()).y).toBeCloseTo(display.large, 0)
      expect(await page.locator('.home-contact').evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(contactTop, 0)
      expect(await page.locator('.home-logo').evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(logoTop, 0)
    }
    // Once the bar retracts, even the first scroll pixel reveals the map.
    await page.setViewportSize({ width: display.width, height: display.large })
    await page.evaluate(() => { window.dispatchEvent(new Event('touchstart')); scrollTo(0, 1) })
    await expect(page.locator('.home-map')).toBeInViewport()
    expect((await page.locator('.home-map').boundingBox()).y).toBeCloseTo(display.large - 1, 0)

    await page.setViewportSize(viewport)
    await page.reload()
    await page.evaluate(() => scrollTo(0, 0))
    expect((await page.locator('.home-map').boundingBox()).y).toBeCloseTo(display.large, 0)

    // The gallery keeps its separate cover sizing and full-width first photo.
    await page.goto('/fotos')
    const firstPhoto = await page.locator('.gallery-photo').first().boundingBox()
    expect(firstPhoto.y).toBeCloseTo((await page.locator('header').boundingBox()).height, 0)
    expect(firstPhoto.y + firstPhoto.height).toBeGreaterThanOrEqual(display.height)
    expect(firstPhoto.width).toBe(display.width)
  })
}

test('a restored split view uses its browser viewport instead of the whole tablet screen', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 782 })
  await modelScreen(page, { width: 1024, height: 1366 })
  await modelLargeViewport(page, 830)
  await page.goto('/')
  expect((await page.locator('.home-map').boundingBox()).y).toBe(830)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
  expect((await page.locator('.home-map').boundingBox()).y).toBe(830)
})

test('older Safari uses vh when the newer viewport units are unavailable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 372 })
  await modelScreen(page, { width: 320, height: 568 })
  await modelLargeViewport(page, 548)
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS)
    CSS.supports = (...args) => args.join(' ').includes('svh') ? false : supports(...args)
  })
  await page.goto('/')
  expect((await page.locator('.home-map').boundingBox()).y).toBe(548)
  await page.setViewportSize({ width: 320, height: 500 })
  expect((await page.locator('.home-map').boundingBox()).y).toBe(548)
})
