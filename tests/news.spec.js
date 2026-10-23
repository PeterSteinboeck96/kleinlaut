import { test, expect } from '@playwright/test'

test.use({ locale: 'de-AT' })

const news = 'Neue Herbstkarte • Weihnachtsmarkt Eröffnung Freitag 13.11.2026 • Wir suchen Verstärkung • Bewerbungen per Mail'

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
})

for (const width of [320, 390, 1024, 1920, 3840]) {
  test(`news fills its own fixed row and loops right without gaps at ${width}px`, async ({ page }) => {
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

    // Seek through a whole cycle to check direction, constant speed and the seam.
    const frames = await track.evaluate(el => {
      const animation = el.getAnimations()[0]
      animation.pause()
      const duration = animation.effect.getTiming().duration
      return [0, 0.25, 0.5, 0.99999, 1].map(progress => {
        animation.currentTime = duration * progress
        const groups = [...el.children].map(group => group.getBoundingClientRect().toJSON())
        return { x: el.getBoundingClientRect().x, groups, duration }
      })
    })
    expect(frames[1].x).toBeGreaterThan(frames[0].x)
    expect(frames[2].x).toBeGreaterThan(frames[1].x)
    expect((frames[2].x - frames[0].x) / (frames[2].duration / 2000)).toBeCloseTo(45, 0)
    for (const frame of frames) {
      expect(frame.groups[0].x).toBeLessThanOrEqual(1)
      expect(frame.groups[1].right).toBeGreaterThanOrEqual(width - 1)
      expect(frame.groups[0].right).toBeCloseTo(frame.groups[1].x, 0)
    }
    // At the exact boundary WebKit may report either the last or first frame.
    // Both must place an identical text group at the same visible position.
    expect(Math.min(...frames[4].groups.map(group => Math.abs(group.x - frames[3].groups[0].x)))).toBeLessThan(0.5)
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
  await expect(track).toHaveCSS('animation-play-state', 'paused')
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(track).toHaveCSS('animation-play-state', 'paused')
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
  await expect(track).toHaveCSS('animation-play-state', 'running')
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
    await expect(bar.locator('#news-text')).toHaveText('New autumn menu • Christmas market opening Friday 13 November 2026 • We’re hiring • Apply by email')
  }
})
