import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
})

async function expectOriginalMap(page) {
  const image = page.locator('.home-map-mobile img')
  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute('src', /\/map_mobile-[^/]+\.webp$/)
  await expect(page.locator('.home-map iframe')).toBeHidden()
  await image.evaluate(element => element.scrollIntoView())
  await expect.poll(() => image.evaluate(element => [element.naturalWidth, element.naturalHeight])).toEqual([2965, 3950])
}

for (const locale of ['de-AT', 'en-GB', 'fr-FR']) {
  test.describe(locale, () => {
    test.use({ locale })

    for (const width of [320, 390, 640, 768, 1023]) {
      test(`original image map at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1024 })
        await page.goto('/')
        await expectOriginalMap(page)
      })
    }

    test('route animates once after scrolling in every site language', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
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
      await expectOriginalMap(page)
      await expect(cover).toHaveClass(/is-drawing/)
      await expect(cover).toHaveCount(0)
      await page.evaluate(() => scrollTo(0, 0))
      await page.locator('.home-map-mobile').evaluate(element => element.scrollIntoView())
      expect(await page.evaluate(() => window.routeAnimations)).toBe(1)
      await expect(cover).toHaveCount(0)
      await expect(page.locator('.home-map-mobile')).toHaveAttribute('href', `https://www.google.com/maps?q=kleinlaut&hl=${locale.startsWith('de') ? 'de' : 'en'}`)
    })

    test.describe('large touch devices', () => {
      test.use({ hasTouch: true })

      for (const width of [1024, 1366]) {
        test(`original image map at ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 1024 })
          await page.goto('/')
          await expectOriginalMap(page)
          await expect(page.locator('.home-map-route')).toHaveClass(/is-drawing/)
          await expect(page.locator('.home-map-route')).toHaveCount(0)
        })
      }
    })

    test.describe('desktop', () => {
      test.use({ hasTouch: false, isMobile: false })

      for (const width of [1024, 1440]) {
        test(`interactive Google Maps at ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 })
          await page.goto('/')
          await expect(page.locator('.home-map-mobile')).toBeHidden()
          await expect(page.locator('.home-map iframe')).toBeVisible()
          await expect(page.locator('.home-map iframe')).toHaveAttribute('src', new RegExp(`output=embed&hl=${locale.startsWith('de') ? 'de' : 'en'}$`))
          await page.locator('.home-map').evaluate(element => element.scrollIntoView())
          await expect(page.locator('.home-map-route')).not.toHaveClass(/is-drawing/)
        })
      }
    })
  })
}
