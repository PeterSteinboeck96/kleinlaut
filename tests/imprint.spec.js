import { test, expect } from '@playwright/test'

test.use({ locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 667, height: 320 }, { width: 1440, height: 900 }]) {
  test(`imprint stays fully readable without scrolling at ${viewport.width}×${viewport.height}`, async ({ page, browserName, isMobile }) => {
    await page.setViewportSize(viewport)
    await page.goto('/impressum')
    if (isMobile && viewport.width > viewport.height && viewport.height < 768) {
      await expect(page.locator('.portrait-notice')).toBeVisible()
      await expect(page.locator('#app')).toHaveAttribute('inert', '')
      await page.evaluate(() => scrollTo(0, 500))
      expect(await page.evaluate(() => scrollY)).toBe(0)
      return
    }
    await page.evaluate(() => document.fonts.ready)
    const header = await page.locator('header').boundingBox()
    for (const line of await page.locator('.imprint-details > p').all()) {
      const box = await line.boundingBox()
      expect(box.y).toBeGreaterThanOrEqual(header.y + header.height)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 68)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    }
    await page.getByRole('link', { name: 'hallo@kleinlaut.wien' }).focus()
    await page.keyboard.press('PageDown')
    if (browserName !== 'webkit' || !isMobile) await page.mouse.wheel(0, 600)
    await page.evaluate(() => scrollTo(0, 500))
    expect(await page.evaluate(() => scrollY)).toBe(0)
    expect(await page.locator('.imprint-page').evaluate(el => el.scrollTop)).toBe(0)
    await expect(page.getByRole('link', { name: 'hallo@kleinlaut.wien' })).toHaveAttribute('href', 'mailto:hallo@kleinlaut.wien')
    await expect(page.getByRole('link', { name: '+43 664 99224120' })).toHaveAttribute('href', 'tel:+4366499224120')
  })
}

test('imprint adapts to a short webview and unlocks only after leaving both fixed pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/impressum')
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, 'height', { configurable: true, get: () => 380 })
    visualViewport.dispatchEvent(new Event('resize'))
  })
  await expect(page.locator('.imprint-page')).toHaveCSS('height', '380px')
  const details = await page.locator('.imprint-details').boundingBox()
  expect(details.y).toBeGreaterThanOrEqual((await page.locator('header').boundingBox()).height)
  expect(details.y + details.height).toBeLessThanOrEqual(380 - 68)

  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')

  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'RAUMPLAN', exact: true }).click()
  await expect(page).toHaveURL('/raumplan')
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'FOTOS', exact: true }).click()
  await expect(page).toHaveURL('/fotos')
  await expect(page.locator('body')).toHaveCSS('position', 'static')
  await page.evaluate(() => scrollTo(0, 300))
  expect(await page.evaluate(() => scrollY)).toBe(300)
  await page.goBack()
  await page.goBack()
  await expect(page).toHaveURL('/impressum')
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')
  await page.reload()
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')
})

test('touch swipes do not move the legal text or the page', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'android-chrome', 'Native touch dispatch uses Chromium CDP.')
  await page.goto('/impressum')
  const client = await context.newCDPSession(page)
  const before = await page.locator('.imprint-details').boundingBox()
  for (const direction of [1, -1]) {
    const start = direction === 1 ? 200 : 550
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: start }] })
    for (let step = 1; step <= 8; step++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: start + direction * step * 35 }] })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  expect(await page.locator('.imprint-details').boundingBox()).toEqual(before)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})
