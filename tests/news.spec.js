import { test, expect } from '@playwright/test'

test.use({ locale: 'de-AT' })

const news = 'Neue Herbstkarte • Weihnachtsmarkt Eröffnung Freitag 13.11.2026 • Wir suchen Verstärkung • Bewerbungen an jobs@kleinlaut.wien'

async function sampleTrack(track, duration, minimumFrames = 1) {
  return track.evaluate((el, { duration, minimumFrames }) => new Promise(resolve => {
    const frames = []
    let start
    const capture = time => {
      start ??= time
      frames.push({ time, x: el.getBoundingClientRect().x, groups: [...el.children].map(group => group.getBoundingClientRect().toJSON()) })
      if (time - start >= duration && frames.length >= minimumFrames) resolve(frames)
      else requestAnimationFrame(capture)
    }
    requestAnimationFrame(capture)
  }), { duration, minimumFrames })
}

function travel(frames) {
  let total = 0
  for (let i = 1; i < frames.length; i++) {
    const width = frames[i].groups[0].width
    let delta = frames[i].x - frames[i - 1].x
    if (delta > width / 2) delta -= width
    if (delta < -width / 2) delta += width
    total += delta
  }
  return total
}

async function nextFrame(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
})

for (const width of [320, 390, 1024, 1920, 3840]) {
  test(`news fills its own fixed row and loops left without gaps at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    const bar = page.getByRole('region', { name: 'Neuigkeiten' })
    const menu = page.locator('.nav13-bar')
    const barBox = await bar.boundingBox()
    const menuBox = await menu.boundingBox()
    expect(barBox.y).toBe(menuBox.y + menuBox.height)
    expect(barBox.height).toBe(menuBox.height)
    expect(barBox.width).toBe(width)
    await expect(bar).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await expect(bar).toHaveCSS('color', 'rgb(255, 255, 0)')
    const font = await menu.locator('.nav13-toggle:visible').evaluate(el => {
      const css = getComputedStyle(el)
      return [css.fontFamily, css.fontSize, css.fontWeight]
    })
    expect(await bar.locator('.news-message').first().evaluate(el => {
      const css = getComputedStyle(el)
      return [css.fontFamily, css.fontSize, css.fontWeight]
    })).toEqual(font)
    await expect(bar.locator('#news-text')).toHaveText(news)
    const track = bar.locator('.news-track')
    await expect.poll(() => track.locator('.news-group').first().evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(width)

    await expect(bar.locator('.news-message').first()).toHaveCSS('text-transform', 'uppercase')
    await expect(bar.locator('.news-message').first()).toHaveCSS('padding-right', '0px')
    await expect(bar.locator('.news-toggle')).toHaveCSS('touch-action', 'pinch-zoom')
    expect(await bar.locator('.news-message').first().textContent()).toBe(`${news} • `)
    // Slow WebKit frames still need enough samples to measure continuous travel.
    const frames = await sampleTrack(track, 220, 4)
    // Movement is capped after long frame gaps; require leftward progress,
    // without assuming a minimum frame rate on a throttled test machine.
    expect(travel(frames)).toBeLessThan(-0.5)
    for (const frame of frames) {
      expect(frame.groups[0].x).toBeLessThanOrEqual(1)
      expect(frame.groups[1].right).toBeGreaterThanOrEqual(width - 1)
      expect(frame.groups[0].right).toBeCloseTo(frame.groups[1].x, 0)
    }
    await page.evaluate(() => scrollTo(0, 400))
    expect(await bar.boundingBox()).toEqual(barBox)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
}

test('news stays above the mobile menu and remains pausable by touch and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const bar = page.getByRole('region', { name: 'Neuigkeiten' })
  const track = bar.locator('.news-track')
  await bar.getByRole('button', { name: 'Lauftext pausieren' }).click()
  await expect(bar.locator('.news-toggle')).toHaveAttribute('data-paused', 'true')
  expect(Math.abs(travel(await sampleTrack(track, 120)))).toBeLessThan(0.5)
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(bar.locator('.news-toggle')).toHaveAttribute('data-paused', 'true')
  expect(Math.abs(travel(await sampleTrack(track, 120)))).toBeLessThan(0.5)
  expect(await bar.evaluate(el => {
    const box = el.getBoundingClientRect()
    return el.contains(document.elementFromPoint(box.width / 2, box.y + box.height / 2))
  })).toBe(true)
  expect(await page.locator('.nav13-menu-viewport').evaluate(el => el.getBoundingClientRect().y))
    .toBe((await bar.boundingBox()).y + (await bar.boundingBox()).height)
  await dialog.getByRole('button', { name: 'Zurück' }).focus()
  await page.keyboard.press('Shift+Tab')
  await expect(bar.getByRole('button', { name: 'Lauftext fortsetzen' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(bar.locator('.news-toggle')).toHaveAttribute('data-paused', 'false')
  expect(travel(await sampleTrack(track, 180))).toBeLessThan(-3)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(bar).toBeInViewport()
})

test('reduced motion keeps all news readable without an animation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/fotos')
  const bar = page.getByRole('region', { name: 'Neuigkeiten' })
  const text = bar.locator('.news-static')
  await expect(text).toHaveText(news)
  await expect(bar.locator('.news-track')).toHaveCount(0)
  await text.focus()
  await page.keyboard.press('End')
  await text.evaluate(el => { el.scrollLeft = el.scrollWidth })
  expect(await text.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  // Changing the OS preference during a visit must also switch the presentation.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(bar.locator('.news-track')).toHaveCount(1)
  await expect(text).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(text).toHaveText(news)
  await expect(bar.locator('.news-track')).toHaveCount(0)
})

test('English news follows the device language on every page', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'languages', { get: () => ['en-GB'] }))
  for (const path of ['/', '/menu', '/fotos', '/raumplan', '/impressum']) {
    await page.goto(path)
    const bar = page.getByRole('region', { name: 'Latest news' })
    await expect(bar).toBeVisible()
    await expect(bar.locator('#news-text')).toHaveText('New autumn menu • Christmas market opening Friday 13 November 2026 • We’re hiring • Apply to jobs@kleinlaut.wien')
  }
})


test('mouse dragging follows the pointer in both directions and coasts without toggling pause', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const button = page.locator('.news-toggle')
  const track = page.locator('.news-track')
  await button.click()
  await expect(button).toHaveAttribute('data-paused', 'true')
  const box = await button.boundingBox()
  for (const direction of [1, -1]) {
    const startX = direction === 1 ? 50 : 250
    const y = box.y + box.height / 2
    await page.mouse.move(startX, y)
    await page.mouse.down()
    const positions = await sampleTrack(track, 40)
    for (let step = 1; step <= 8; step++) {
      await page.mouse.move(startX + direction * step * 20, y)
      await nextFrame(page)
      positions.push(...await sampleTrack(track, 0))
    }
    expect(travel(positions)).toBeCloseTo(direction * 160, -1)
    await expect(button).toHaveCSS('cursor', 'grabbing')
    // Release while moving, after assertions; holding still intentionally has no momentum.
    await page.mouse.move(startX + direction * 180, y)
    await page.mouse.up()
    await expect(button).toHaveAttribute('data-paused', 'true')
    const coast = await sampleTrack(track, 500, 6)
    expect(direction * travel(coast)).toBeGreaterThan(15)
    const midpoint = Math.floor(coast.length / 2)
    // Uneven frame spacing must not look like acceleration. Compare speed,
    // not distances covered by two groups with different elapsed durations.
    const speed = frames => Math.abs(travel(frames)) / (frames.at(-1).time - frames[0].time)
    expect(speed(coast.slice(midpoint))).toBeLessThan(speed(coast.slice(0, midpoint + 1)))
  }
})

test('keyboard movement crosses loop boundaries with exactly one space around each bullet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const button = page.locator('.news-toggle')
  await button.click()
  await button.focus()
  const track = page.locator('.news-track')
  const width = await track.locator('.news-group').first().evaluate(el => el.getBoundingClientRect().width)
  const frames = []
  for (let step = 0; step < Math.ceil(width / 120) + 2; step++) {
    await page.keyboard.press('ArrowRight')
    await nextFrame(page)
    frames.push(...await sampleTrack(track, 0))
  }
  expect(travel(frames)).toBeLessThan(-width)
  for (const frame of frames) {
    expect(frame.groups[0].x).toBeLessThanOrEqual(1)
    expect(frame.groups[1].right).toBeGreaterThanOrEqual(page.viewportSize().width - 1)
  }
  const repeated = await track.locator('.news-group').first().textContent()
  expect(repeated).not.toMatch(/ {2,}/)
  expect(repeated).toMatch(/ • $/)
})

test('touch swipes keep the page still on the ticker and allow scrolling outside it', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'android-chrome', 'Real touch gestures use Chromium CDP; other engines cover the same pointer handlers with mouse input.')
  await page.goto('/')
  await page.evaluate(() => scrollTo(0, 300))
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(300)
  const client = await context.newCDPSession(page)
  const button = page.locator('.news-toggle')
  const track = page.locator('.news-track')
  await button.tap()
  await expect(button).toHaveAttribute('data-paused', 'true')
  const box = await button.boundingBox()
  const y = box.y + box.height / 2
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 60, y }] })
  for (let step = 1; step <= 8; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 60 + step * 20, y: y - step * 6 }] })
    await nextFrame(page)
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  expect(travel(await sampleTrack(track, 200))).toBeGreaterThan(15)
  expect(await page.evaluate(() => scrollY)).toBe(300)
  await expect(button).toHaveAttribute('data-paused', 'true')
  await expect(button).toHaveCSS('touch-action', 'pinch-zoom')
  // Even a vertical drift leaving the bar must not hand the gesture to the page.
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y }] })
  for (let step = 1; step <= 5; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: y - step * 12 }] })
    await nextFrame(page)
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  expect(await page.evaluate(() => scrollY)).toBe(300)
  await expect(button).toHaveAttribute('data-dragging', 'false')

  // The static, reduced-motion variant uses native horizontal scrolling only.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const staticText = page.locator('.news-static')
  await expect(staticText).toHaveCSS('touch-action', 'pan-x pinch-zoom')
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 260, y }] })
  for (let step = 1; step <= 8; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 260 - step * 20, y: y + step * 6 }] })
    await nextFrame(page)
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => staticText.evaluate(el => el.scrollLeft)).toBeGreaterThan(50)
  expect(await page.evaluate(() => scrollY)).toBe(300)

  // A new gesture on the page below the fixed bars still scrolls normally.
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 600 }] })
  for (let step = 1; step <= 8; step++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: 600 - step * 30 }] })
    await nextFrame(page)
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300)
})
