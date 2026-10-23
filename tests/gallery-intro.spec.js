import { test, expect } from '@playwright/test'

test.use({ locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
  await page.addInitScript(() => {
    window.galleryFrames = []
    const capture = time => {
      const grid = document.querySelector('.gallery-grid')
      if (grid) window.galleryFrames.push({ time, y: new DOMMatrix(getComputedStyle(grid).transform).m42, scroll: scrollY, glass: Boolean(document.querySelector('.gallery-intro-glass')) })
      requestAnimationFrame(capture)
    }
    requestAnimationFrame(capture)
  })
})

test('mobile gallery gives one glass swipe cue, settles exactly, and keeps scrolling untouched', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/fotos')
  const glass = page.locator('.gallery-intro-glass')
  await expect(glass).toBeVisible()
  await expect(glass).toHaveCSS('pointer-events', 'none')
  await expect(glass).toHaveAttribute('aria-hidden', 'true')
  await expect(glass).toHaveCount(0)
  const frames = await page.evaluate(() => window.galleryFrames)
  expect(frames.some(frame => frame.glass && frame.y < -20)).toBe(true)
  expect(frames.every(frame => frame.scroll === 0)).toBe(true)
  await expect(page.locator('.gallery-grid')).toHaveCSS('transform', 'none')
  const photo = await page.locator('.gallery-photo').first().boundingBox()
  expect(photo.y).toBe((await page.locator('header').boundingBox()).height)
  expect(photo.y + photo.height).toBeGreaterThanOrEqual(page.viewportSize().height)
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.waitForTimeout(700)
  await expect(glass).toHaveCount(0)
})

test('an immediate swipe or an opened menu cancels the cue without fighting the user', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/fotos')
  await page.evaluate(() => scrollTo(0, 300))
  await page.waitForTimeout(700)
  await expect(page.locator('.gallery-intro-glass')).toHaveCount(0)
  expect(await page.evaluate(() => scrollY)).toBe(300)
  await page.reload()
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  await page.waitForTimeout(700)
  await expect(page.locator('.gallery-intro-glass')).toHaveCount(0)
  await expect(page.locator('.gallery-grid')).toHaveCSS('transform', 'none')
})

test('desktop and reduced motion have no gallery intro', async ({ page }) => {
  for (const { width, reducedMotion } of [{ width: 1440, reducedMotion: 'no-preference' }, { width: 390, reducedMotion: 'reduce' }]) {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion })
    await page.goto('/fotos')
    await page.waitForTimeout(700)
    await expect(page.locator('.gallery-intro-glass')).toHaveCount(0)
    expect(await page.evaluate(() => window.galleryFrames.every(frame => !frame.glass && frame.y === 0))).toBe(true)
  }
})

test('interacting during the nudge cancels it and removes the temporary transform', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/fotos')
  await expect(page.locator('.gallery-intro-glass')).toBeVisible()
  await page.mouse.click(20, 250)
  await expect(page.locator('.gallery-intro-glass')).toHaveCount(0)
  await expect(page.locator('.gallery-grid')).toHaveCSS('transform', 'none')
})
