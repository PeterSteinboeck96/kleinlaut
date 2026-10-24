import { test, expect } from '@playwright/test'

test.use({ hasTouch: true, isMobile: true, locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
})

test('pull-down exposes one black backing below the yellow menu and news row', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  await expect(page.locator('.top-bar')).toHaveCSS('background-color', 'rgb(255, 255, 0)')
  const news = await page.locator('.news-bar').boundingBox()
  // Model content moving down beneath fixed bars; native Instagram chrome is outside the DOM.
  await page.locator('.home-page').evaluate(el => {
    el.style.position = 'relative'
    el.style.top = '160px'
  })
  const clip = { x: 0, y: news.y + news.height, width: 390, height: 160 }
  const screenshot = await page.screenshot({ clip })
  const black = await page.evaluate(async base64 => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, image.width, image.height).data.every((value, index) => index % 4 === 3 || value === 0)
  }, screenshot.toString('base64'))
  expect(black).toBe(true)
})

test('floorplan fits changing webview heights without scrolling and releases its lock on navigation', async ({ page }) => {
  await page.goto('/raumplan')
  await expect(page.locator('html')).toHaveClass(/fixed-page-open/)
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')
  await page.evaluate(() => {
    window.testVisualHeight = 634
    Object.defineProperty(visualViewport, 'height', { configurable: true, get: () => window.testVisualHeight })
    document.documentElement.style.setProperty('--safe-top', '44px')
    document.documentElement.style.setProperty('--safe-bottom', '34px')
  })
  for (const height of [634, 710, 634]) {
    await page.evaluate(height => {
      window.testVisualHeight = height
      visualViewport.dispatchEvent(new Event('resize'))
    }, height)
    await expect(page.locator('.floorplan-page')).toHaveCSS('height', `${height}px`)
    const image = await page.getByAltText('Raumplan').boundingBox()
    const header = await page.locator('header').boundingBox()
    expect(image.y).toBeGreaterThanOrEqual(header.y + header.height)
    expect(image.y + image.height).toBeLessThanOrEqual(height - 34 - 68)
    expect(image.height).toBeGreaterThan(0)
    await page.evaluate(() => scrollTo(0, 500))
    expect(await page.evaluate(() => scrollY)).toBe(0)
  }

  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')

  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'FOTOS', exact: true }).click()
  await expect(page).toHaveURL('/fotos')
  await expect(page.locator('html')).not.toHaveClass(/fixed-page-open/)
  await expect(page.locator('body')).toHaveCSS('position', 'static')
  await page.evaluate(() => scrollTo(0, 500))
  expect(await page.evaluate(() => scrollY)).toBe(500)
  await page.goBack()
  await expect(page.locator('body')).toHaveCSS('position', 'fixed')
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/fixed-page-open/)
})

test('touch gestures cannot drag the floorplan, but the open menu can still scroll', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'android-chrome', 'Native touch dispatch uses Chromium CDP.')
  await page.goto('/raumplan')
  const client = await context.newCDPSession(page)
  const swipe = async (from, to) => {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
    for (let step = 1; step <= 8; step++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * step / 8, y: from.y + (to.y - from.y) * step / 8 }] })
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const before = await page.getByAltText('Raumplan').boundingBox()
  const scrollOffsets = []
  await page.exposeFunction('recordScroll', y => scrollOffsets.push(y))
  await page.evaluate(() => addEventListener('scroll', () => window.recordScroll(scrollY)))
  await swipe({ x: 190, y: 200 }, { x: 190, y: 550 })
  await swipe({ x: 190, y: 550 }, { x: 190, y: 200 })
  expect(await page.getByAltText('Raumplan').boundingBox()).toEqual(before)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  expect(scrollOffsets.every(y => y === 0)).toBe(true)

  // Short portrait viewport with enlarged text: a phone in landscape is
  // deliberately covered by the rotation notice instead of showing the menu.
  await page.setViewportSize({ width: 320, height: 480 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  const panel = page.locator('.nav13-panel')
  await swipe({ x: 250, y: 270 }, { x: 250, y: 120 })
  await expect.poll(() => panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})
