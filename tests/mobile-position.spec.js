import { test, expect } from '@playwright/test'

test.use({ hasTouch: true, locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    window.testDevice = { width: 390, height: 844, orientation: 'portrait-primary' }
    for (const dimension of ['width', 'height']) {
      Object.defineProperty(screen, dimension, { get: () => window.testDevice[dimension], configurable: true })
    }
    Object.defineProperty(screen.orientation, 'type', { get: () => window.testDevice.orientation, configurable: true })
    Object.defineProperty(screen.orientation, 'angle', {
      get: () => window.testDevice.angle ?? (window.testDevice.orientation.startsWith('landscape') ? 90 : 0),
      configurable: true,
    })
  })
})

async function addWidget(page) {
  await page.evaluate(() => {
    const frame = document.createElement('iframe')
    frame.className = 'molzait'
    frame.title = 'Reservation fixture'
    frame.srcdoc = '<!doctype html><button>Reserve</button>'
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:225px;height:70px;border:0;z-index:2147483647'
    document.body.append(frame)
  })
  const frame = page.locator('iframe.molzait')
  await expect(frame).toHaveAttribute('data-stable-launcher', '')
  return frame
}

test('gallery caption and closed widget stay still when browser controls retract', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 })
  await page.goto('/fotos')
  await page.evaluate(() => {
    // Real mobile svh remains unchanged while dvh grows as the toolbar hides.
    document.documentElement.style.setProperty('--stable-viewport-height', '664px')
    document.documentElement.style.setProperty('--safe-bottom', '34px')
    document.documentElement.style.setProperty('--stable-safe-bottom', '34px')
  })
  await page.evaluate(() => document.fonts.ready)
  const frame = await addWidget(page)
  const caption = page.locator('.gallery-caption > span')
  const initialWidget = await frame.boundingBox()
  const initialCaption = await caption.boundingBox()
  for (const [height, inset] of [[720, 0], [800, 34], [664, 34]]) {
    await page.setViewportSize({ width: 390, height })
    await page.evaluate(value => document.documentElement.style.setProperty('--safe-bottom', `${value}px`), inset)
    await page.evaluate(() => scrollTo(0, 500))
    await expect.poll(async () => (await frame.boundingBox()).y).toBeCloseTo(initialWidget.y, 0)
    expect((await caption.boundingBox()).y).toBeCloseTo(initialCaption.y, 0)
    await expect(page.locator('.portrait-notice')).toHaveCount(0)
  }
  // The expanded provider form still uses the entire available safe viewport.
  await page.setViewportSize({ width: 390, height: 800 })
  await frame.evaluate(element => { element.style.width = '100%'; element.style.height = '100%' })
  await expect(frame).not.toHaveAttribute('data-stable-launcher', '')
  expect((await frame.boundingBox()).y).toBe(0)
  expect((await frame.boundingBox()).height).toBe(766)
  await frame.evaluate(element => { element.style.width = '225px'; element.style.height = '70px' })
  await expect(frame).toHaveAttribute('data-stable-launcher', '')
  expect((await frame.boundingBox()).y).toBeCloseTo(initialWidget.y, 0)
})

test('portrait notice covers a rotated phone and restores scroll, focus and widget', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/fotos')
  const frame = await addWidget(page)
  await page.evaluate(() => scrollTo(0, 600))
  await page.getByRole('button', { name: 'Menü öffnen' }).focus()
  await page.setViewportSize({ width: 844, height: 390 })
  await page.evaluate(() => {
    window.testDevice = { width: 844, height: 390, orientation: 'landscape-primary' }
    screen.orientation.dispatchEvent(new Event('change'))
  })
  const notice = page.getByRole('dialog', { name: 'Du hast dein Handy umgekippt!' })
  await expect(notice).toBeVisible()
  await expect(notice).toBeFocused()
  await expect(page.locator('#app')).toHaveAttribute('inert', '')
  await expect(frame).toBeHidden()
  expect(await notice.boundingBox()).toMatchObject({ x: 0, y: 0, width: 844, height: 390 })
  await page.evaluate(() => scrollBy(0, 400))
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    window.testDevice = { width: 390, height: 844, orientation: 'portrait-primary' }
    screen.orientation.dispatchEvent(new Event('change'))
  })
  await expect(notice).toHaveCount(0)
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  await expect(frame).toBeVisible()
  await expect(page.getByRole('button', { name: 'Menü öffnen' })).toBeFocused()
  expect(await page.evaluate(() => scrollY)).toBe(600)
})

test('keyboard-sized portrait viewports never trigger the rotation notice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const frame = await addWidget(page)
  await frame.evaluate(element => { element.style.width = '100%'; element.style.height = '100%' })
  await page.setViewportSize({ width: 390, height: 260 })
  await expect(page.locator('.portrait-notice')).toHaveCount(0)
  await expect(frame).toBeVisible()
})

test('English landscape visits receive the English notice immediately', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['en-GB'] })
    window.testDevice = { width: 844, height: 390, orientation: 'landscape-primary' }
  })
  await page.setViewportSize({ width: 844, height: 390 })
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: 'You tipped your phone over!' })).toBeVisible()
  await expect(page.getByText('Please turn it upright again')).toBeVisible()
})

test('tablet landscape remains available', async ({ page }) => {
  await page.addInitScript(() => {
    window.testDevice = { width: 1194, height: 834, orientation: 'landscape-primary' }
  })
  await page.setViewportSize({ width: 1194, height: 834 })
  await page.goto('/')
  await expect(page.locator('.portrait-notice')).toHaveCount(0)
})

for (const api of ['screen', 'legacy Safari']) {
  test(`martini follows both tilt directions using ${api} orientation`, async ({ page }) => {
    await page.addInitScript(legacy => {
      window.testDevice = { width: 568, height: 320, orientation: 'landscape-primary', angle: 90 }
      if (legacy) {
        Object.defineProperty(screen, 'orientation', { value: undefined, configurable: true })
        Object.defineProperty(window, 'orientation', { get: () => window.testDevice.angle, configurable: true })
      }
    }, api === 'legacy Safari')
    await page.setViewportSize({ width: 568, height: 320 })
    await page.goto('/fotos')
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--safe-inline', '44px')
      document.documentElement.style.setProperty('--safe-bottom', '21px')
      return document.fonts.ready
    })
    const notice = page.getByRole('dialog', { name: 'Du hast dein Handy umgekippt!' })
    const glass = notice.locator('img')
    const message = notice.getByText('Bitte richte es wieder auf')
    await expect(notice).toBeVisible()
    await expect(message).toBeVisible()
    await expect.poll(() => glass.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)

    for (const angle of [90, -90, 270, 90]) {
      await page.evaluate(value => {
        window.testDevice.angle = value
        if (screen.orientation) screen.orientation.dispatchEvent(new Event('change'))
        else window.dispatchEvent(new Event('orientationchange'))
      }, angle)
      await expect(glass).toHaveCSS('transform', angle === 90 ? 'none' : 'matrix(-1, 0, 0, 1, 0, 0)')
      await expect(notice).toBeFocused()
      await expect(page.locator('#app')).toHaveAttribute('inert', '')
    }

    for (const element of [glass, notice.locator('h2'), message]) {
      const box = await element.boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(44)
      expect(box.x + box.width).toBeLessThanOrEqual(568 - 44)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(320 - 21)
    }
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await page.setViewportSize({ width: 320, height: 568 })
    await page.evaluate(() => {
      window.testDevice = { width: 320, height: 568, orientation: 'portrait-primary', angle: 0 }
      window.dispatchEvent(new Event('orientationchange'))
    })
    await expect(notice).toHaveCount(0)
    await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  })
}
