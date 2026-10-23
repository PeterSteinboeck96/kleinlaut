import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
  // Capture configuration when the provider's deferred script starts, not after
  // React renders: an English fallback must already be set for the widget.
  await page.route('https://reserve.molzait.com/assets/embed.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.widgetLocaleAtStartup = document.querySelector("script[molzait]").dataset.locale',
  }))
})

for (const { preferences, fallback, expected } of [
  { preferences: ['de'], expected: 'de' },
  { preferences: ['de-AT', 'en-GB'], expected: 'de' },
  { preferences: ['de-CH'], expected: 'de' },
  { preferences: ['DE-de'], expected: 'de' },
  { preferences: ['en-GB', 'de-AT'], expected: 'en' },
  { preferences: ['fr-FR', 'de'], expected: 'en' },
  { preferences: ['es-ES'], expected: 'en' },
  { preferences: ['ja-JP'], expected: 'en' },
  { preferences: [], fallback: 'de-DE', expected: 'de' },
  { preferences: [], fallback: '', expected: 'en' },
]) {
  test(`preferred language ${preferences.join(',') || fallback || 'unavailable'} selects ${expected} before widget startup`, async ({ page }) => {
    await page.addInitScript(({ preferences, fallback }) => {
      Object.defineProperty(navigator, 'languages', { get: () => preferences })
      Object.defineProperty(navigator, 'language', { get: () => fallback ?? preferences[0] })
    }, { preferences, fallback })
    for (const path of ['/', '/impressum']) {
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('lang', expected)
      await expect.poll(() => page.evaluate(() => window.widgetLocaleAtStartup)).toBe(expected)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', expected === 'de'
        ? 'Kleinlaut | Die bunte Bar im Herzen Wiens <3'
        : 'Kleinlaut | The colourful bar in the heart of Vienna <3')
      if (path === '/') await expect(page.locator('.home-hours')).toHaveText(expected === 'de' ? 'Dienstag bis Samstag18:00–02:00 Uhr' : 'Tuesday to Saturday6 pm–2 am')
      else await expect(page.getByText(expected === 'de' ? 'Gastronomiebetrieb' : 'Hospitality business')).toBeVisible()
    }
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', expected)
    await expect.poll(() => page.evaluate(() => window.widgetLocaleAtStartup)).toBe(expected)
  })
}

test.describe('English page content', () => {
  test.use({ locale: 'en-GB' })

  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    test(`English pages and navigation fit ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      for (const path of ['/', '/menu', '/fotos', '/raumplan', '/impressum']) {
        await page.goto(path)
        await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
        if (path === '/') {
          await expect(page.locator('.home-contact')).toHaveText('Questions? Give us a call, message us on Instagram or send us an email :)')
          await expect(page.getByRole('link', { name: 'Give us a call' })).toHaveAttribute('href', 'tel:+4366499224120')
          await expect(page.getByRole('link', { name: 'send us an email' })).toHaveAttribute('href', 'mailto:hallo@kleinlaut.wien')
          await expect(page.locator('.home-hero-background img')).toHaveAttribute('alt', 'Cocktail in a softly lit bar')
          const map = page.locator(`.home-map-${viewport.width < 640 ? 'mobile' : 'desktop'} iframe`)
          await expect(map).toHaveAttribute('src', /[?&]hl=en(?:&|$)/)
          await expect(map).toHaveAttribute('title', 'Kleinlaut location on Google Maps')
          if (viewport.width < 1024) {
            await page.getByRole('button', { name: 'Open menu' }).click()
            const dialog = page.getByRole('dialog', { name: 'Menu', exact: true })
            await expect(dialog.getByRole('link')).toHaveText(['DRINKS', 'PHOTOS', 'FLOOR PLAN', 'LEGAL NOTICE'])
            await dialog.getByRole('link', { name: 'PHOTOS', exact: true }).click()
            await expect(page).toHaveURL('/fotos')
          }
        }
        if (path === '/menu') {
          const links = page.getByRole('navigation', { name: 'Page navigation', exact: true }).getByRole('link')
          await expect(links).toHaveText(['DRINKS', 'PHOTOS', 'FLOOR PLAN', 'LEGAL NOTICE'])
          for (const link of await links.all()) {
            await link.scrollIntoViewIfNeeded()
            await expect(link).toBeInViewport()
          }
          await page.getByRole('link', { name: 'START', exact: true }).click()
          await expect(page).toHaveURL('/')
        }
        if (path === '/fotos') {
          await expect(page.getByRole('img', { name: /^Photo from the Kleinlaut gallery/ })).toHaveCount(60)
          await expect(page.locator('.gallery-caption')).toHaveText('The colourful barin the heartof Vienna <3')
          const first = await page.locator('.gallery-photo').first().boundingBox()
          if (viewport.width < 1024) {
            expect(first.width).toBe(viewport.width)
            expect(first.y + first.height).toBeGreaterThanOrEqual(viewport.height)
          } else {
            const second = await page.locator('.gallery-photo').nth(1).boundingBox()
            expect(first.width).toBeCloseTo(second.width, 0)
            expect(first.height).toBeCloseTo(second.height, 0)
            expect(first.width).toBeLessThan(viewport.width)
            expect(second.y).toBeCloseTo(first.y, 0)
          }
        }
        if (path === '/raumplan') {
          const plan = page.getByRole('img', { name: /^Floor plan/ })
          await expect(plan).toBeVisible()
          await expect(plan.locator('text')).toHaveText(['Garden', 'Back room'])
          await expect(plan.locator('desc')).toHaveText('Garden, Séparée, Bar, WC, Floor, Back room')
          const box = await plan.boundingBox()
          expect(box.y).toBeGreaterThanOrEqual(52)
          expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 68)
          await page.evaluate(() => window.scrollTo(0, 500))
          expect(await page.evaluate(() => scrollY)).toBe(0)
        }
        if (path === '/impressum') {
          await expect(page.getByText('JP Frameworks GmbH')).toBeVisible()
          await expect(page.getByText('Hospitality business')).toBeVisible()
        }
      }
    })
  }
})

test('resizing reorders mobile photo three without losing images or changing the cover', async ({ page }) => {
  await page.goto('/fotos')
  const photos = page.locator('.gallery-photo')
  const original = Array.from({ length: 60 }, (_, i) => i + 1)
  for (const width of [390, 1024, 844, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(photos).toHaveCount(60)
    await expect.poll(() => photos.evaluateAll(images => images.map(image => Number(image.src.match(/\/(\d+)-/)[1])))).toEqual(width < 1024 ? [...original.filter(number => number !== 3), 3] : original)
    await expect(photos.first()).toHaveAttribute('src', /\/1-/)
    const [first, second] = await Promise.all([photos.first().boundingBox(), photos.nth(1).boundingBox()])
    if (width < 1024) {
      expect(first.width).toBe(width)
      expect(second.y).toBeCloseTo(first.y + first.height, 0)
    } else {
      expect(first.width).toBeCloseTo(width / (width >= 1280 ? 4 : 3), 0)
      expect(second.y).toBeCloseTo(first.y, 0)
    }
  }
})
