import { test, expect } from '@playwright/test'

const routes = ['/', '/menu', '/fotos', '/raumplan', '/impressum']
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 614, height: 1024 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 667, height: 320 },
  { width: 844, height: 390 },
]

async function expectNoHorizontalOverflow(page) {
  const excess = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)
  expect(excess, `${page.url()} has horizontal overflow`).toBeLessThanOrEqual(1)
}

async function expectCentered(locator, page) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(Math.abs(box.x + box.width / 2 - viewportWidth / 2)).toBeLessThanOrEqual(2)
}

async function expectReachable(locator, page) {
  await locator.scrollIntoViewIfNeeded()
  await expect(locator).toBeInViewport()
  const box = await locator.boundingBox()
  const header = await page.locator('header').boundingBox()
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height - 1)
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height + 1)
}

test.beforeEach(async ({ page }) => {
  // Isolate layout/navigation from third-party outages and reservation overlays.
  // Live fonts, the actual reservation widget and social-app webviews need a separate smoke check.
  await page.route('https://**/*', (route) => {
    const contentType = { stylesheet: 'text/css', script: 'application/javascript', document: 'text/html' }[route.request().resourceType()] || 'text/plain'
    return route.fulfill({ body: '', contentType })
  })
})

test('home preserves content, contact links and responsive assets', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'MENU', exact: true })).toBeVisible()
  await expect(page.getByText('Dienstag bis Samstag')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Anruf' })).toHaveAttribute('href', 'tel:+4366499224120')
  await expect(page.getByRole('link', { name: 'Mail', exact: true })).toHaveAttribute('href', 'mailto:hallo@kleinlaut.wien')
  await expect(page.getByRole('link', { name: 'DMs' })).toHaveAttribute('href', 'https://www.instagram.com/kleinlaut1070/')
  const hero = page.getByAltText('Cocktail in a dimly lit bar')
  await expect.poll(() => hero.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  expect(await hero.evaluate((img) => img.currentSrc)).toContain(page.viewportSize().width < 1024 ? '/hero-' : '/hero_desktop-')
  await expect(page.getByAltText('Kleinlaut on Google Maps')).toBeVisible({ visible: page.viewportSize().width < 640 })
  await expect(page.locator('iframe')).toBeVisible({ visible: page.viewportSize().width >= 640 })
  await expect(page.locator('script[molzait]')).toHaveAttribute('data-restaurant', 'kleinlaut-f7687aa9f1')
})

test('menu links, PDF, history and return navigation work', async ({ page, request }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'MENU', exact: true }).click()
  await expect(page).toHaveURL('/menu')
  const pdf = page.getByRole('link', { name: 'DRINKS', exact: true })
  await expect(pdf).toHaveAttribute('target', '_blank')
  const response = await request.get(await pdf.getAttribute('href'))
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('application/pdf')
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-')

  for (const [name, path] of [['FOTOS', '/fotos'], ['RAUMPLAN', '/raumplan'], ['IMPRESSUM', '/impressum']]) {
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL(path)
    await page.goBack()
    await expect(page.getByRole('link', { name: 'ZURÜCK' })).toBeVisible()
  }
  await page.getByRole('link', { name: 'ZURÜCK' }).click()
  await expect(page).toHaveURL('/')
})

test('gallery retains all photos, numeric order and scroll navigation', async ({ page }) => {
  await page.goto('/fotos')
  const photos = page.getByRole('img', { name: /^Gallery image/ })
  await expect(photos).toHaveCount(60)
  const sources = await photos.evaluateAll((images) => images.map((img) => Number(img.src.match(/\/(\d+)-/)[1])))
  expect(sources).toEqual(Array.from({ length: 60 }, (_, i) => i + 1))
  await expect.poll(() => photos.first().evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect(page.getByRole('link', { name: 'MENU', exact: true })).toBeInViewport()
  await page.getByRole('link', { name: 'MENU', exact: true }).click()
  await page.getByRole('link', { name: 'FOTOS', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

test('all routes support direct loads and reloads without runtime errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  for (const path of [...routes, '/drinks']) {
    await page.goto(path)
    await expect(page.locator('header')).toBeVisible()
    await page.reload()
    await expect(page.locator('header')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    if (path === '/raumplan') {
      await expect.poll(() => page.getByAltText('Raumplan').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
    }
    if (path === '/impressum') await expect(page.getByText('JP Frameworks GmbH')).toBeVisible()
    if (path === '/drinks') await expect(page).toHaveURL('/')
  }
  expect(errors).toEqual([])
})

for (const viewport of viewports) {
  test(`responsive layout stays centered and usable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const route of routes) {
      await page.goto(route)
      await expectNoHorizontalOverflow(page)
      const headerLink = page.locator('header a')
      const headerBox = await headerLink.boundingBox()
      expect(headerBox.height).toBeGreaterThanOrEqual(44)
      await expectCentered(headerLink, page)

      if (route === '/') {
        const logo = page.getByAltText('Kleinlaut', { exact: true })
        await expectCentered(logo, page)
        await expectCentered(page.getByText('Dienstag bis Samstag'), page)
        await expectReachable(page.getByRole('link', { name: 'Mail', exact: true }), page)
      }
      if (route === '/menu') {
        for (const name of ['DRINKS', 'FOTOS', 'RAUMPLAN', 'IMPRESSUM']) {
          const link = page.getByRole('link', { name, exact: true })
          await expectCentered(link, page)
          await expectReachable(link, page)
          const box = await link.boundingBox()
          expect(box.height).toBeGreaterThanOrEqual(44)
          expect(box.width).toBeGreaterThanOrEqual(44)
        }
      }
      if (route === '/raumplan') {
        const floorPlan = page.getByAltText('Raumplan')
        await expect.poll(() => floorPlan.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
        await expectCentered(floorPlan, page)
        const floorPlanBox = await floorPlan.boundingBox()
        expect(floorPlanBox.y).toBeGreaterThanOrEqual(headerBox.height)
        expect(floorPlanBox.y + floorPlanBox.height).toBeLessThanOrEqual(viewport.height - 68)
        expect(floorPlanBox.y + floorPlanBox.height).toBeGreaterThan(headerBox.height)
        await page.evaluate(() => window.scrollTo(0, 500))
        expect(await page.evaluate(() => window.scrollY)).toBe(0)
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height)
      }
      if (route === '/impressum') {
        await expectCentered(page.getByText('JP Frameworks GmbH'), page)
        await expectReachable(page.getByText('Gastronomie Betrieb'), page)
      }
      if (route === '/fotos') {
        const photos = page.getByRole('img', { name: /^Gallery image/ })
        const [first, second] = await Promise.all([photos.nth(0).boundingBox(), photos.nth(1).boundingBox()])
        if (viewport.width < 640) expect(second.y).toBeGreaterThan(first.y)
        else expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1)
      }
      await expectNoHorizontalOverflow(page)
    }
  })
}

test('resizing from portrait to short landscape and back keeps navigation usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.setViewportSize({ width: 844, height: 390 })
  await expectNoHorizontalOverflow(page)
  await page.getByRole('link', { name: 'MENU', exact: true }).click()
  await page.getByRole('link', { name: 'IMPRESSUM', exact: true }).click()
  await expectReachable(page.getByText('Gastronomie Betrieb'), page)
  await page.setViewportSize({ width: 390, height: 600 })
  await expectCentered(page.getByText('JP Frameworks GmbH'), page)
  await expectReachable(page.getByText('Gastronomie Betrieb'), page)
  await page.getByRole('link', { name: 'MENU', exact: true }).click()
  await page.getByRole('link', { name: 'ZURÜCK', exact: true }).click()
  await expectReachable(page.getByRole('link', { name: 'Mail', exact: true }), page)
  await expectNoHorizontalOverflow(page)
})

test('reduced motion suppresses entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const animations = await page.getByAltText('Kleinlaut', { exact: true }).evaluate((element) => {
    const style = getComputedStyle(element)
    return { name: style.animationName, durations: style.animationDuration.split(',').map(parseFloat) }
  })
  expect(animations.name === 'none' || animations.durations.every((duration) => duration <= 0.01)).toBeTruthy()
  await expect(page.getByAltText('Kleinlaut', { exact: true })).toHaveCSS('opacity', '1')
})

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`reservation frame respects simulated safe areas at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--safe-top', '44px')
      document.documentElement.style.setProperty('--safe-bottom', '34px')
      // Model the external provider's fixed frame; do not depend on its network availability.
      const frame = document.createElement('iframe')
      frame.className = 'molzait'
      frame.title = 'Reservation test fixture'
      frame.srcdoc = '<!doctype html><title>Reservation test fixture</title>'
      frame.style.cssText = 'position:fixed;z-index:100;bottom:0;right:0;width:210px;height:70px;max-width:100vw;max-height:100vh;border:0'
      document.body.append(frame)
    })
    const frame = page.getByTitle('Reservation test fixture', { exact: true })
    const buttonBox = await frame.boundingBox()
    expect(buttonBox.y + buttonBox.height).toBe(viewport.height - 34)
    expect(buttonBox.x).toBeGreaterThanOrEqual(0)
    expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(viewport.width)
    const topBar = await page.locator('header').boundingBox()
    expect(topBar.height).toBe(44 + 52)
    if (viewport.height > 480) {
      for (const name of ['Anruf', 'DMs', 'Mail']) {
        const linkBox = await page.getByRole('link', { name, exact: true }).boundingBox()
        expect(buttonBox.y - (linkBox.y + linkBox.height)).toBeGreaterThanOrEqual(32)
      }
    }
    await frame.evaluate((element) => {
      element.style.width = '500px'
      element.style.height = '900px'
    })
    const dialogBox = await frame.boundingBox()
    expect(dialogBox.y).toBeGreaterThanOrEqual(44)
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height - 34)
    expect(dialogBox.x).toBeGreaterThanOrEqual(0)
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width)
    await expectNoHorizontalOverflow(page)
  })
}

for (const width of [320, 390]) {
  test(`enlarged text stays readable and menu navigation remains reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const path of ['/', '/menu', '/impressum', '/raumplan']) {
      await page.goto(path)
      // Exercise a larger user text preference without shrinking the actual text to fit.
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
      await page.evaluate(() => document.fonts.ready)
      await expectNoHorizontalOverflow(page)
      if (path === '/') await expectReachable(page.getByRole('link', { name: 'Mail', exact: true }), page)
      if (path === '/menu') {
        for (const name of ['DRINKS', 'FOTOS', 'RAUMPLAN', 'IMPRESSUM']) {
          const link = page.getByRole('link', { name, exact: true })
          await expectCentered(link, page)
          await expectReachable(link, page)
        }
        await page.getByRole('link', { name: 'IMPRESSUM', exact: true }).click()
        await expect(page).toHaveURL('/impressum')
      }
      if (path === '/impressum') await expectReachable(page.getByText('Gastronomie Betrieb'), page)
    }
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
  test(`mobile hero covers browser chrome and reveals map only after scrolling at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    for (const toolbarHeight of [100, 0, 72]) {
      // Headless browsers have no native toolbar: model a smaller dynamic viewport
      // while retaining the large viewport used for the background cover.
      await page.evaluate((height) => {
        document.documentElement.style.setProperty('--viewport-height', `${height}px`)
        document.documentElement.style.setProperty('--safe-top', '59px')
        document.documentElement.style.setProperty('--safe-bottom', '34px')
        window.scrollTo(0, 0)
      }, viewport.height - toolbarHeight)
      const map = page.locator('.home-map')
      const mapBox = await map.boundingBox()
      const imageBox = await page.getByAltText('Cocktail in a dimly lit bar').boundingBox()
      const headerBox = await page.locator('header').boundingBox()
      // Safari can display the next section underneath its floating toolbar,
      // beyond the height reported for the content viewport. Reserve the header
      // and bottom safe-area allowance in addition to the full background height.
      expect(mapBox.y).toBeGreaterThanOrEqual(viewport.height + headerBox.height + 34 - 1)
      expect(imageBox.height).toBeGreaterThanOrEqual(viewport.height + 34 - 1)
      const contactBottom = await page.getByRole('link', { name: 'Mail', exact: true }).evaluate(el => el.getBoundingClientRect().bottom)
      const reservationFrameTop = viewport.height - toolbarHeight - 34 - 70
      expect(reservationFrameTop - contactBottom).toBeGreaterThanOrEqual(32)
      await page.evaluate(() => window.scrollBy(0, 300))
      await expect(map).toBeInViewport()
    }
  })
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 525, height: 1024 }, { width: 614, height: 1024 }]) {
  test(`home brand and menu align with their content boundaries at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const header = await page.locator('header').boundingBox()
    const logo = await page.getByAltText('Kleinlaut', { exact: true }).boundingBox()
    const hours = await page.getByText('Dienstag bis Samstag').boundingBox()
    const contact = await page.locator('.home-contact').boundingBox()
    const brandCenter = (logo.y + hours.y + hours.height) / 2
    expect(Math.abs(brandCenter - (header.y + header.height + contact.y) / 2)).toBeLessThanOrEqual(2)
    expect(contact.x).toBeGreaterThanOrEqual(16)
    expect(viewport.width - contact.x - contact.width).toBeGreaterThanOrEqual(16)
    await expect(page.locator('.home-contact')).toHaveCSS('text-wrap-mode', 'wrap')
    await page.getByRole('link', { name: 'MENU', exact: true }).click()
    const menu = await page.getByRole('navigation', { name: 'Seitennavigation' }).boundingBox()
    const buttonTop = viewport.height - 68
    expect(Math.abs(menu.y + menu.height / 2 - (header.y + header.height + buttonTop) / 2)).toBeLessThanOrEqual(2)
    await page.getByRole('link', { name: 'IMPRESSUM', exact: true }).click()
    await expect(page.locator('.imprint-details > p')).toHaveCount(7)
    const lines = await page.locator('.imprint-details > p').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()))
    expect(lines[1].y - lines[0].bottom).toBeGreaterThanOrEqual(16)
    for (let i = 2; i < lines.length; i++) expect(Math.abs(lines[i].y - lines[i - 1].bottom)).toBeLessThanOrEqual(1)
  })
}
