import { test, expect } from '@playwright/test'

test.use({ locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
})

test('interrupted news drags cannot restart a paused ticker', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const ticker = page.locator('.news-toggle')
  await ticker.click()
  for (const event of ['blur', 'pagehide', 'visibilitychange']) {
    const box = await ticker.boundingBox()
    const y = box.y + box.height / 2
    await page.mouse.move(40, y)
    await page.mouse.down()
    for (let step = 1; step <= 4; step++) {
      await page.mouse.move(40 + step * 40, y)
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
    }
    await page.evaluate(type => {
      if (type === 'visibilitychange') {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
        document.dispatchEvent(new Event(type))
        delete document.hidden
      } else window.dispatchEvent(new Event(type))
    }, event)
    await page.mouse.up()
    const positions = await page.locator('.news-track').evaluate(element => new Promise(resolve => {
      const values = []
      const start = performance.now()
      function capture() {
        values.push(element.getBoundingClientRect().x)
        if (performance.now() - start < 250) requestAnimationFrame(capture)
        else resolve(values)
      }
      requestAnimationFrame(capture)
    }))
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(0.5)
    await expect(ticker).toHaveAttribute('data-paused', 'true')
    await expect(ticker).toHaveAttribute('data-dragging', 'false')
  }
  // Cancellation must not prevent the next deliberate interaction.
  await ticker.click()
  await expect(ticker).toHaveAttribute('data-paused', 'false')
})

test('an immediate browser return restores every desktop menu link', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/menu')
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByRole('link', { name: 'FOTOS', exact: true }).click()
    await expect(page).toHaveURL('/fotos')
    // Do not wait for the destination DOM: history changes before React commits it.
    await page.goBack()
    await expect(page).toHaveURL('/menu')
    await expect(page.locator('.menu-links a')).toHaveCount(4)
    await expect(page.getByRole('link', { name: 'RAUMPLAN', exact: true })).toBeVisible()
  }
})

for (const [width, height, fontSize] of [[320, 480, 24], [360, 640, 32], [844, 390, 24], [1024, 600, 32]]) {
  test(`fixed imprint fits enlarged text at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/impressum')
    await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px` }, fontSize)
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(() => page.locator('.imprint-details').evaluate(element => {
      const box = element.getBoundingClientRect()
      const header = document.querySelector('header').getBoundingClientRect()
      return box.top >= header.bottom && box.bottom <= innerHeight - 68 && box.left >= 0 && box.right <= innerWidth
    })).toBe(true)
    await page.evaluate(() => scrollTo(0, 500))
    expect(await page.evaluate(() => scrollY)).toBe(0)
    // Restoring available space must also restore the intended type size.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => { document.documentElement.style.fontSize = '16px' })
    await expect(page.locator('.imprint-details')).toHaveCSS('--content-scale', '1')
  })
}

for (const width of [390, 1440]) {
  test(`browser Back cancels pending menu navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    if (width < 1024) {
      await page.getByRole('button', { name: 'Menü öffnen' }).click()
      await page.getByRole('dialog').getByRole('link', { name: 'FOTOS', exact: true }).click()
      await expect(page).toHaveURL('/fotos')
      await expect(page.locator('.menu-reveal')).toHaveCount(0)
      await page.getByRole('button', { name: 'Menü öffnen' }).click()
      await page.getByRole('dialog').getByRole('link', { name: 'RAUMPLAN', exact: true }).click()
    } else {
      await page.getByRole('link', { name: 'MENÜ', exact: true }).click()
      await page.getByRole('link', { name: 'FOTOS', exact: true }).click()
    }
    await page.goBack()
    await expect(page).toHaveURL('/')
    // Let every pending exit callback run; none may push a stale destination.
    await page.waitForTimeout(500)
    await expect(page).toHaveURL('/')
    await expect(page.locator('[inert]')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveClass(/navigation-open|fixed-page-open/)
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
    await expect(page.locator('.menu-reveal')).toHaveCount(0)
  })

  test(`changing reduced motion affects an already open menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(width < 1024 ? '/' : '/menu')
    if (width < 1024) await page.getByRole('button', { name: 'Menü öffnen' }).click()
    await expect(page.locator('.nav13-menu-link').last()).toHaveCSS('transform', 'none')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.news-static')).toBeVisible()
    await page.evaluate(() => {
      window.exitFrames = []
      const capture = () => {
        window.exitFrames.push([...document.querySelectorAll('.nav13-menu-link')].map(element => new DOMMatrix(getComputedStyle(element).transform).m42))
        if (document.querySelector('.nav13-menu-link')) requestAnimationFrame(capture)
      }
      requestAnimationFrame(capture)
    })
    await page.getByRole(width < 1024 ? 'button' : 'link', { name: width < 1024 ? 'Zurück' : 'ZURÜCK', exact: true }).click()
    await expect(page.locator('.nav13-menu-link')).toHaveCount(0)
    await expect(page.locator('.menu-reveal')).toHaveCount(0)
    expect(await page.evaluate(() => window.exitFrames.flat().every(y => y === 0))).toBe(true)
    await expect(page).toHaveURL('/')
  })
}
