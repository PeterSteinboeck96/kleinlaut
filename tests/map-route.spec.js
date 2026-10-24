import { test, expect } from '@playwright/test'

test.use({ locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

for (const width of [320, 503, 639]) {
  test(`map route appears once after scrolling into view at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    const cover = page.locator('.home-map-route')
    await expect(cover).toHaveCount(1)
    await expect(cover).not.toHaveClass(/is-drawing/)
    await page.evaluate(() => {
      window.routeAnimations = 0
      document.addEventListener('animationstart', event => {
        if (event.animationName === 'map-route-reveal') window.routeAnimations++
      })
    })
    await page.locator('.home-map-mobile').evaluate(element => element.scrollIntoView())
    await expect(cover).toHaveClass(/is-drawing/)
    await expect(cover).toHaveCount(0)
    expect(await page.evaluate(() => window.routeAnimations)).toBe(1)
    await page.evaluate(() => scrollTo(0, 0))
    await page.locator('.home-map-mobile').evaluate(element => element.scrollIntoView())
    await expect(cover).toHaveCount(0)
    expect(await page.evaluate(() => window.routeAnimations)).toBe(1)
    await expect(page.locator('.home-map-mobile')).toHaveAttribute('href', 'https://www.google.com/maps?q=kleinlaut&hl=de')

    // Returning through the site's navigation must keep the completed route.
    await page.getByRole('button', { name: 'Menü öffnen' }).click()
    await page.getByRole('dialog').getByRole('link', { name: 'FOTOS', exact: true }).click()
    await expect(page).toHaveURL('/fotos')
    await page.getByRole('button', { name: 'Menü öffnen' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Zurück' }).click()
    await expect(page).toHaveURL('/')
    await expect(cover).toHaveCount(0)
  })
}

test('desktop map does not consume the mobile route animation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.locator('.home-map').evaluate(element => element.scrollIntoView())
  await expect(page.locator('.home-map-route')).toBeHidden()
  await expect(page.locator('.home-map-route')).not.toHaveClass(/is-drawing/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.home-map-mobile').evaluate(element => element.scrollIntoView())
  await expect(page.locator('.home-map-route')).toHaveClass(/is-drawing/)
  await expect(page.locator('.home-map-route')).toHaveCount(0)
})

test('reduced motion shows the complete route immediately', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.home-map-route')).toHaveCount(0)
  await page.locator('.home-map-mobile').evaluate(element => element.scrollIntoView())
  await expect(page.locator('.home-map-mobile img')).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('.home-map-route')).toHaveCount(0)
})

test('enabling reduced motion during the reveal completes the route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.home-map-mobile').evaluate(element => element.scrollIntoView())
  await expect(page.locator('.home-map-route')).toHaveClass(/is-drawing/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.home-map-route')).toHaveCount(0)
})
