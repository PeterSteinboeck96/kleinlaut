import { test, expect } from '@playwright/test'

test.use({ hasTouch: true, isMobile: true, locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({
    body: '',
    contentType: route.request().resourceType() === 'script' ? 'application/javascript' : 'text/plain',
  }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function modelScreen(page, display) {
  // Headless browsers have no translucent native controls. Keep the hardware
  // display fixed while the reported page viewport changes underneath them.
  await page.addInitScript(display => {
    window.testScreen = display
    for (const dimension of ['width', 'height']) {
      Object.defineProperty(screen, dimension, { configurable: true, get: () => window.testScreen[dimension] })
    }
  }, display)
}

for (const display of [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 402, height: 874 },
  { width: 430, height: 932 },
  { width: 932, height: 430 },
]) {
  test(`mobile photo covers the physical display beyond browser controls at ${display.width}×${display.height}`, async ({ page }) => {
    const viewport = { width: display.width, height: display.height - 150 }
    await page.setViewportSize(viewport)
    await modelScreen(page, display)
    await page.goto('/')

    for (const safeBottom of [0, 34]) {
      await page.setViewportSize(viewport)
      await page.evaluate(({ height, safeBottom }) => {
        document.documentElement.style.setProperty('--safe-top', '0px')
        document.documentElement.style.setProperty('--safe-bottom', `${safeBottom}px`)
        document.querySelector('.home-page').style.setProperty('--home-content-height', `${height}px`)
        window.scrollTo(0, 0)
      }, { height: viewport.height, safeBottom })
      const contactTop = await page.locator('.home-contact').evaluate(el => el.getBoundingClientRect().top + scrollY)
      const logoTop = await page.locator('.home-logo').evaluate(el => el.getBoundingClientRect().top + scrollY)

      for (const height of [viewport.height, viewport.height + 50, viewport.height]) {
        await page.setViewportSize({ width: display.width, height })
        const map = await page.locator('.home-map').boundingBox()
        const photo = await page.locator('.home-hero-background img').boundingBox()
        expect(map.y).toBeGreaterThanOrEqual(display.height)
        expect(photo.y + photo.height).toBeCloseTo(map.y, 0)
        expect(await page.locator('.home-contact').evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(contactTop, 0)
        expect(await page.locator('.home-logo').evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(logoTop, 0)
      }

      await page.locator('.home-map').evaluate(el => el.scrollIntoView())
      await expect(page.locator('.home-map')).toBeInViewport()
    }

    await page.reload()
    await page.evaluate(() => window.scrollTo(0, 0))
    expect((await page.locator('.home-map').boundingBox()).y).toBeGreaterThanOrEqual(display.height)

    await page.goto('/fotos')
    const firstPhoto = await page.locator('.gallery-photo').first().boundingBox()
    const header = await page.locator('header').boundingBox()
    expect(firstPhoto.y).toBeCloseTo(header.height, 0)
    expect(firstPhoto.y + firstPhoto.height).toBeGreaterThanOrEqual(display.height)
    expect(firstPhoto.width).toBe(display.width)
  })
}

test('rotation and restored pages update the cover without using a full-screen height in split views', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 782 })
  await modelScreen(page, { width: 430, height: 932 })
  await page.goto('/')
  expect((await page.locator('.home-map').boundingBox()).y).toBeGreaterThanOrEqual(932)

  // Model a mobile browser retaining portrait screen dimensions on rotation.
  await page.setViewportSize({ width: 932, height: 280 })
  await expect.poll(() => page.locator('.home-map').evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(932)
  expect((await page.locator('.home-map').boundingBox()).y).toBeGreaterThanOrEqual(430)

  await page.setViewportSize({ width: 430, height: 782 })
  await page.evaluate(() => {
    window.testScreen = { width: 430, height: 956 }
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  })
  expect((await page.locator('.home-map').boundingBox()).y).toBeGreaterThanOrEqual(956)

  // A narrow tablet window must use its own viewport, not the whole display.
  await page.evaluate(() => {
    window.testScreen = { width: 1024, height: 1366 }
    window.dispatchEvent(new Event('resize'))
  })
  expect((await page.locator('.home-map').boundingBox()).y).toBeLessThan(956)
  expect(await page.locator('.home-hero').evaluate(el => el.style.getPropertyValue('--mobile-screen-height'))).toBe('')

  // A landscape split window can coincidentally match the display's height.
  await page.evaluate(() => { window.testScreen = { width: 1366, height: 1024 } })
  await page.setViewportSize({ width: 1024, height: 700 })
  await expect.poll(() => page.locator('.home-map').evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(1024)
  expect(await page.locator('.home-hero').evaluate(el => el.style.getPropertyValue('--mobile-screen-height'))).toBe('')
})
