import { test, expect } from '@playwright/test'

test.use({ locale: 'de-AT' })

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

async function coloredPixelsInBottomStrip(page) {
  const { width, height } = page.viewportSize()
  const screenshot = await page.screenshot({ clip: { x: 0, y: height - 100, width, height: 100 } })
  return page.evaluate(async base64 => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    let colored = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] || data[i + 1] || data[i + 2]) colored++
    }
    return colored
  }, screenshot.toString('base64'))
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
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible()
  await expect(page.getByText('Dienstag bis Samstag')).toBeVisible()
  await expect(page.getByRole('link', { name: 'ruf uns gerne an' })).toHaveAttribute('href', 'tel:+4366499224120')
  await expect(page.getByRole('link', { name: 'E-Mail', exact: true })).toHaveAttribute('href', 'mailto:hallo@kleinlaut.wien')
  await expect(page.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/kleinlaut1070/')
  const hero = page.getByAltText('Cocktail in einer stimmungsvoll beleuchteten Bar')
  await expect.poll(() => hero.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  expect(await hero.evaluate((img) => img.currentSrc)).toContain(page.viewportSize().width < 1024 ? '/hero-' : '/hero_desktop-')
  await expect(page.getByAltText('Kleinlaut auf Google Maps')).toBeVisible({ visible: page.viewportSize().width < 640 })
  await expect(page.locator('iframe')).toBeVisible({ visible: page.viewportSize().width >= 640 })
  await expect(page.locator('script[molzait]')).toHaveAttribute('data-restaurant', 'kleinlaut-f7687aa9f1')
})

test('menu links, PDF, history and return navigation work', async ({ page, request }) => {
  await page.goto('/')
  await page.goto('/menu')
  await expect(page).toHaveURL('/menu')
  const pdf = page.locator('.menu-links').getByRole('link', { name: 'DRINKS', exact: true })
  await expect(pdf).toHaveAttribute('target', '_blank')
  const response = await request.get(await pdf.getAttribute('href'))
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('application/pdf')
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-')

  for (const [name, path] of [['FOTOS', '/fotos'], ['RAUMPLAN', '/raumplan'], ['IMPRESSUM', '/impressum']]) {
    await page.locator('.menu-links').getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL(path)
    await page.goBack()
    await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible()
  }
  await page.goto('/')
  await expect(page).toHaveURL('/')
})

test('gallery retains all photos and moves photo three last only on mobile', async ({ page }) => {
  await page.goto('/fotos')
  const photos = page.getByRole('img', { name: /^Foto aus der Kleinlaut-Galerie/ })
  await expect(photos).toHaveCount(60)
  const sources = await photos.evaluateAll((images) => images.map((img) => Number(img.src.match(/\/(\d+)-/)[1])))
  const originalOrder = Array.from({ length: 60 }, (_, i) => i + 1)
  expect(sources).toEqual(page.viewportSize().width < 1024 ? [...originalOrder.filter(number => number !== 3), 3] : originalOrder)
  await expect.poll(() => photos.first().evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeInViewport()
  await page.goto('/menu')
  await page.locator('.menu-links').getByRole('link', { name: 'FOTOS', exact: true }).click()
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
      const headerLink = page.getByRole('navigation', { name: 'Hauptnavigation' })
      const headerBox = await headerLink.boundingBox()
      expect(headerBox.height).toBeGreaterThanOrEqual(44)
      await expectCentered(headerLink, page)

      if (route === '/') {
        const logo = page.getByAltText('Kleinlaut', { exact: true })
        await expectCentered(logo, page)
        await expectCentered(page.getByText('Dienstag bis Samstag'), page)
        await expectReachable(page.getByRole('link', { name: 'E-Mail', exact: true }), page)
      }
      if (route === '/menu') {
        for (const name of ['DRINKS', 'FOTOS', 'RAUMPLAN', 'IMPRESSUM']) {
          const link = page.locator('.menu-links').getByRole('link', { name, exact: true })
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
        await expectReachable(page.getByText('Gastronomiebetrieb'), page)
      }
      if (route === '/fotos') {
        const photos = page.getByRole('img', { name: /^Foto aus der Kleinlaut-Galerie/ })
        const [first, second, third] = await Promise.all([photos.nth(0).boundingBox(), photos.nth(1).boundingBox(), photos.nth(2).boundingBox()])
        expect(first.x).toBe(0)
        expect(first.y).toBeCloseTo(headerBox.height, 0)
        if (viewport.width < 1024) {
          expect(first.width).toBe(viewport.width)
          expect(first.y + first.height).toBeGreaterThanOrEqual(viewport.height)
          expect(second.y).toBeCloseTo(first.y + first.height, 0)
          if (viewport.width < 640) expect(third.y).toBeGreaterThan(second.y)
          else expect(Math.abs(second.y - third.y)).toBeLessThanOrEqual(1)
        } else {
          const columns = viewport.width >= 1536 ? 5 : viewport.width >= 1280 ? 4 : 3
          expect(first.width).toBeCloseTo(viewport.width / columns, 0)
          expect(first.height).toBeCloseTo(second.height, 0)
          expect(second.y).toBeCloseTo(first.y, 0)
          expect(third.y).toBeCloseTo(first.y, 0)
          expect(second.x).toBeCloseTo(first.width, 0)
          expect(third.x).toBeCloseTo(first.width + second.width, 0)
        }
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
  await page.goto('/menu')
  await page.locator('.menu-links').getByRole('link', { name: 'IMPRESSUM', exact: true }).click()
  await expectReachable(page.getByText('Gastronomiebetrieb'), page)
  await page.setViewportSize({ width: 390, height: 600 })
  await expectCentered(page.getByText('JP Frameworks GmbH'), page)
  await expectReachable(page.getByText('Gastronomiebetrieb'), page)
  await page.goto('/menu')
  await page.goto('/')
  await expectReachable(page.getByRole('link', { name: 'E-Mail', exact: true }), page)
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
      for (const name of ['ruf uns gerne an', 'Instagram', 'E-Mail']) {
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
      if (path === '/') await expectReachable(page.getByRole('link', { name: 'E-Mail', exact: true }), page)
      if (path === '/menu') {
        for (const name of ['DRINKS', 'FOTOS', 'RAUMPLAN', 'IMPRESSUM']) {
          const link = page.locator('.menu-links').getByRole('link', { name, exact: true })
          await expectCentered(link, page)
          await expectReachable(link, page)
        }
        await page.locator('.menu-links').getByRole('link', { name: 'IMPRESSUM', exact: true }).click()
        await expect(page).toHaveURL('/impressum')
      }
      if (path === '/impressum') await expectReachable(page.getByText('Gastronomiebetrieb'), page)
    }
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
  test(`mobile hero covers browser chrome and reveals map only after scrolling at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    // Model the stable small viewport separately from the changing toolbar height.
    await page.locator('.home-page').evaluate((el, height) => el.style.setProperty('--home-content-height', `${height}px`), viewport.height - 100)
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
      const imageBox = await page.getByAltText('Cocktail in einer stimmungsvoll beleuchteten Bar').boundingBox()
      const headerBox = await page.locator('header').boundingBox()
      // Safari can display the next section underneath its floating toolbar,
      // beyond the height reported for the content viewport. Reserve the header
      // and bottom safe-area allowance in addition to the full background height.
      expect(mapBox.y).toBeGreaterThanOrEqual(viewport.height + headerBox.height + 34 - 1)
      expect(imageBox.height).toBeGreaterThanOrEqual(viewport.height + 34 - 1)
      const contactBottom = await page.getByRole('link', { name: 'E-Mail', exact: true }).evaluate(el => el.getBoundingClientRect().bottom)
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
    await page.goto('/menu')
    const menu = await page.getByRole('navigation', { name: 'Seitennavigation' }).boundingBox()
    const buttonTop = viewport.height - 68
    expect(Math.abs(menu.y + menu.height / 2 - (header.y + header.height + buttonTop) / 2)).toBeLessThanOrEqual(2)
    await page.locator('.menu-links').getByRole('link', { name: 'IMPRESSUM', exact: true }).click()
    await expect(page.locator('.imprint-details > p')).toHaveCount(7)
    const lines = await page.locator('.imprint-details > p').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().toJSON()))
    expect(lines[1].y - lines[0].bottom).toBeGreaterThanOrEqual(16)
    for (let i = 2; i < lines.length; i++) expect(Math.abs(lines[i].y - lines[i - 1].bottom)).toBeLessThanOrEqual(1)
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`contact stays anchored as browser controls change and scrolls beneath the header at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.addStyleTag({ content: ':root { --safe-top: 47px; --safe-bottom: 34px; }' })
    await page.locator('.home-page').evaluate((el, height) => el.style.setProperty('--home-content-height', `${height}px`), viewport.height - 100)
    const contact = page.locator('.home-contact')
    const documentTop = await contact.evaluate(el => el.getBoundingClientRect().top + scrollY)
    for (const toolbarHeight of [100, 0, 72]) {
      await page.evaluate(height => document.documentElement.style.setProperty('--viewport-height', `${height}px`), viewport.height - toolbarHeight)
      expect(await contact.evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(documentTop, 0)
      await expect(contact).toHaveCSS('visibility', 'visible')
      await expect(contact).toHaveCSS('opacity', '1')
    }
    const headerBottom = await page.locator('header').evaluate(el => el.getBoundingClientRect().bottom)
    await page.evaluate(y => window.scrollTo(0, y), documentTop - headerBottom + 8)
    // Normal document scrolling: the first line passes under the header without
    // hiding the rest of the paragraph or detaching it from its original position.
    await expect(contact).toHaveCSS('visibility', 'visible')
    await expect(contact).toHaveCSS('opacity', '1')
    expect(await contact.evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(documentTop, 0)
    const textBottom = await contact.evaluate(el => {
      const range = document.createRange()
      range.selectNodeContents(el)
      return range.getBoundingClientRect().bottom + scrollY
    })
    await page.evaluate(y => window.scrollTo(0, y), textBottom - headerBottom + 2)
    expect(await contact.evaluate(el => {
      const range = document.createRange()
      range.selectNodeContents(el)
      return range.getBoundingClientRect().bottom
    })).toBeLessThanOrEqual(headerBottom)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.getByRole('link', { name: 'E-Mail', exact: true })).toBeVisible()
    expect(await contact.evaluate(el => el.getBoundingClientRect().top)).toBeCloseTo(documentTop, 0)
  })
}

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`Navigation13 routes, PDF and contact actions work at ${viewport.width}px`, async ({ page, request }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const mobile = viewport.width < 1024
    async function navigation() {
      if (mobile) {
        await page.getByRole('button', { name: 'Menü öffnen' }).click()
        await expect(page.getByRole('dialog', { name: 'Menü', exact: true })).toBeVisible()
        return page.getByRole('navigation', { name: 'Mobile Seitennavigation' })
      }
      await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'MENÜ', exact: true }).click()
      return page.getByRole('navigation', { name: 'Seitennavigation', exact: true })
    }
    let nav = await navigation()
    const pdf = nav.getByRole('link', { name: 'DRINKS', exact: true })
    await expect(pdf).toHaveAttribute('target', '_blank')
    expect((await request.get(await pdf.getAttribute('href'))).ok()).toBeTruthy()
    await nav.getByRole('link', { name: 'FOTOS', exact: true }).click()
    await expect(page).toHaveURL('/fotos')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    for (const [name, path] of [['RAUMPLAN', '/raumplan'], ['IMPRESSUM', '/impressum']]) {
      nav = await navigation()
      await nav.getByRole('link', { name, exact: true }).click()
      await expect(page).toHaveURL(path)
    }
    nav = await navigation()
    if (mobile) await page.getByRole('button', { name: 'Start' }).click()
    else await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'START', exact: true }).click()
    await expect(page).toHaveURL('/')
    await expectNoHorizontalOverflow(page)
  })
}

test('mobile menu traps focus, closes with Escape, restores scrolling and closes on desktop resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const opener = page.getByRole('button', { name: 'Menü öffnen' })
  const dialog = page.getByRole('dialog', { name: 'Menü', exact: true })
  await opener.click()
  await expect(dialog.getByRole('button', { name: 'Start' })).toBeFocused()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy()
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(opener).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await opener.click()
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(dialog).not.toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.setViewportSize({ width: 320, height: 568 })
  await opener.click()
  await dialog.getByRole('link', { name: 'IMPRESSUM', exact: true }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('link', { name: 'IMPRESSUM', exact: true })).toBeInViewport()
  await dialog.getByRole('button', { name: 'Start' }).click()
  await expect(dialog).not.toBeVisible()
})

for (const width of [390, 1440]) {
  test(`simplified header has the requested controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    if (width < 1024) {
      const toggle = nav.getByRole('button', { name: 'Menü öffnen' })
      await expect(toggle).toHaveText('MENÜ')
      await expect(nav.locator('svg')).toHaveCount(0)
      const box = await toggle.boundingBox()
      expect(box.x).toBe(0)
      expect(box.width).toBe(width)
      await toggle.click({ position: { x: 2, y: box.height / 2 } })
      const close = page.getByRole('button', { name: 'Start' })
      await expect(close).toHaveText('START')
      await expect(close).toHaveCSS('outline-style', 'none')
      await expect(close).toHaveCSS('text-decoration-line', 'none')
      await expect(page.locator('.nav13-footer')).toHaveCount(0)
      await page.keyboard.press('Tab')
      await expect(page.getByRole('dialog').getByRole('link', { name: 'DRINKS', exact: true })).toHaveCSS('text-decoration-line', 'underline')
      const closeBox = await close.boundingBox()
      expect(closeBox.x).toBe(0)
      expect(closeBox.width).toBe(width)
      await close.click({ position: { x: width - 2, y: closeBox.height / 2 } })
      await expect(page.getByRole('dialog')).not.toBeVisible()
    } else {
      const menu = nav.getByRole('link', { name: 'MENÜ', exact: true })
      await expect(nav.getByRole('link')).toHaveCount(1)
      await expectCentered(menu, page)
      await expect(menu).toHaveCSS('font-weight', '800')
      await menu.click()
      await expect(page).toHaveURL('/menu')
      await expect(page.getByRole('navigation', { name: 'Seitennavigation', exact: true }).getByRole('link')).toHaveCount(4)
      await expect(page.getByRole('link', { name: 'START', exact: true })).toBeVisible()
    }
  })
}

for (const start of ['/fotos', '/raumplan', '/impressum']) {
  test(`menu text animates out before returning home from ${start}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(start)
    await page.getByRole('button', { name: 'Menü öffnen' }).click()
    const dialog = page.getByRole('dialog', { name: 'Menü', exact: true })
    const panel = dialog.locator('.nav13-panel')
    const panelTop = await page.locator('.nav13-panel-bar').evaluate(el => el.getBoundingClientRect().bottom)
    await expect.poll(() => panel.evaluate(el => el.getBoundingClientRect().top)).toBeCloseTo(panelTop, 0)
    expect(await dialog.evaluate(el => getComputedStyle(el, '::backdrop').backgroundColor)).toBe('rgba(0, 0, 0, 0)')
    await expect(dialog.getByRole('link', { name: 'IMPRESSUM', exact: true })).toHaveCSS('opacity', '1')
    const firstLink = dialog.getByRole('link', { name: 'DRINKS', exact: true })
    await dialog.getByRole('button', { name: 'Start' }).click()
    await expect.poll(() => firstLink.evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(0.99)
    await expect(panel).toHaveCSS('transform', 'none')
    await expect(panel).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(start)
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await expect(page).toHaveURL('/')
    await expect(dialog).not.toBeVisible()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
}

for (const width of [1024, 1440, 1920]) {
  test(`desktop menu animates its links in and out at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    for (const destination of ['/fotos', '/']) {
      await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'MENÜ', exact: true }).click()
      const nav = page.getByRole('navigation', { name: 'Seitennavigation', exact: true })
      const links = nav.getByRole('link')
      // Staggered entry: the first link becomes visible before the last one.
      await expect.poll(() => links.evaluateAll(elements =>
        elements.length === 4 && Number(getComputedStyle(elements[0]).opacity) > Number(getComputedStyle(elements.at(-1)).opacity)
      ), { intervals: [10, 20, 50] }).toBe(true)
      await expect(links.last()).toHaveCSS('opacity', '1')
      await expectCentered(nav, page)
      await expect(nav).toHaveCSS('transform', 'none')
      await expect(page.locator('.menu-page')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
      if (destination === '/') await page.getByRole('link', { name: 'START', exact: true }).click()
      else await nav.getByRole('link', { name: 'FOTOS', exact: true }).click()
      // Navigation waits for the text to exit; the black page stays stationary.
      await expect.poll(() => links.first().evaluate(el => Number(getComputedStyle(el).opacity)), { intervals: [10, 20, 50] }).toBeLessThan(0.99)
      await expect(page).toHaveURL('/menu')
      await expect(nav).toHaveCSS('transform', 'none')
      await expect(page).toHaveURL(destination)
    }
  })
}

test('mobile page links wait for the closing animation before navigating', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  const panel = page.locator('.nav13-panel')
  const panelTop = await page.locator('.nav13-panel-bar').evaluate(el => el.getBoundingClientRect().bottom)
  await expect.poll(() => panel.evaluate(el => el.getBoundingClientRect().top)).toBeCloseTo(panelTop, 0)
  await expect(page.getByRole('dialog').getByRole('link', { name: 'IMPRESSUM', exact: true })).toHaveCSS('opacity', '1')
  const firstLink = page.getByRole('dialog').getByRole('link', { name: 'DRINKS', exact: true })
  await page.getByRole('dialog').getByRole('link', { name: 'FOTOS', exact: true }).click()
  await expect.poll(() => firstLink.evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(0.99)
  await expect(panel).toHaveCSS('transform', 'none')
  await expect(page).toHaveURL('/')
  await expect(page).toHaveURL('/fotos')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

for (const { width, start } of [
  { width: 390, start: '/' },
  { width: 1440, start: '/' },
  { width: 390, start: '/fotos' },
]) {
  test(`menu text exits, black fades, then home entrance replays from ${start} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(start)
    if (start === '/') await expect(page.locator('.home-logo')).toHaveCSS('opacity', '1')
    for (let cycle = 0; cycle < 2; cycle++) {
      if (width < 1024) await page.getByRole('button', { name: 'Menü öffnen' }).click()
      else await page.getByRole('link', { name: 'MENÜ', exact: true }).click()
      await expect(page.locator('.menu-links a').last()).toHaveCSS('opacity', '1')
      // Record rendered frames instead of relying on polling a 150ms transition.
      await page.evaluate(() => {
        const frames = []
        const entrances = []
        let frameId
        const onAnimation = event => {
          if (event.animationName === 'fade-rise' && event.target.matches('.home-logo, .home-hours')) {
            entrances.push({ name: event.target.classList.contains('home-logo') ? 'logo' : 'hours', covered: Boolean(document.querySelector('.menu-reveal')) })
          }
        }
        const capture = () => {
          const cover = document.querySelector('.menu-reveal')
          const logo = document.querySelector('.home-logo')
          frames.push({
            links: document.querySelectorAll('.menu-links a').length,
            cover: cover ? Number(getComputedStyle(cover).opacity) : null,
            black: cover ? getComputedStyle(cover).backgroundColor : null,
            logo: logo ? Number(getComputedStyle(logo).opacity) : null,
          })
          frameId = requestAnimationFrame(capture)
        }
        document.addEventListener('animationstart', onAnimation)
        frameId = requestAnimationFrame(capture)
        window.menuTransitionProbe = {
          frames,
          stop: () => {
            cancelAnimationFrame(frameId)
            document.removeEventListener('animationstart', onAnimation)
            return { frames, entrances }
          },
        }
      })
      if (width < 1024) await page.getByRole('button', { name: 'Start' }).click()
      else await page.getByRole('link', { name: 'START', exact: true }).click()
      await expect.poll(() => page.evaluate(() => window.menuTransitionProbe.frames.some(frame => frame.cover !== null))).toBe(true)
      await expect(page.locator('.menu-reveal')).toHaveCount(0)
      await expect(page).toHaveURL('/')
      await expect(page.locator('.home-logo')).toHaveCSS('opacity', '1')
      await expect(page.locator('.home-hours')).toHaveCSS('opacity', '1')
      const { frames, entrances } = await page.evaluate(() => window.menuTransitionProbe.stop())
      const fade = frames.filter(frame => frame.cover !== null)
      expect(fade.some(frame => frame.cover > 0 && frame.cover < 1)).toBe(true)
      // During a route change the home logo may not be mounted yet. Both an
      // absent and a fully transparent logo keep the entrance behind the fade.
      expect(fade.every(frame => frame.links === 0 && (frame.logo === null || frame.logo === 0) && frame.black === 'rgb(0, 0, 0)')).toBe(true)
      expect(entrances).toEqual([{ name: 'logo', covered: false }, { name: 'hours', covered: false }])
      expect(frames.some(frame => frame.cover === null && frame.links === 0 && frame.logo > 0 && frame.logo < 1)).toBe(true)
    }
  })
}


test('reservation widget remains clickable and keyboard reachable above the menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.evaluate(() => {
    const frame = document.createElement('iframe')
    frame.className = 'molzait'
    frame.title = 'Reservation foreground fixture'
    frame.style.cssText = 'position:fixed;z-index:2147483647;bottom:0;right:0;width:210px;height:70px;border:0'
    frame.srcdoc = '<button onclick="this.textContent=String.fromCharCode(79,75)">Reservieren</button>'
    document.body.append(frame)
  })
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  const panel = page.locator('.nav13-panel')
  await expect(panel).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  await expect(panel).toHaveCSS('transform', 'none')
  await expect(page.getByRole('dialog').locator('a[href^="mailto:"], a[href^="tel:"]')).toHaveCount(0)
  const frame = page.getByTitle('Reservation foreground fixture')
  expect(await frame.evaluate(el => {
    const rect = el.getBoundingClientRect()
    return document.elementFromPoint(rect.x + 10, rect.y + 10) === el && !el.closest('[inert]')
  })).toBeTruthy()
  await page.frameLocator('iframe.molzait').getByRole('button', { name: 'Reservieren' }).click()
  await expect(page.frameLocator('iframe.molzait').getByRole('button', { name: 'OK' })).toBeVisible()
  await page.getByRole('dialog').getByRole('link', { name: 'IMPRESSUM', exact: true }).focus()
  await page.keyboard.press('Tab')
  expect(await frame.evaluate(el => document.activeElement === el)).toBeTruthy()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(await page.locator('.home-hero').evaluate(el => el.inert)).toBe(false)
})

for (const { name, path, scrollTo } of [
  { name: 'home hero', path: '/', scrollTo: null },
  { name: 'home map', path: '/', scrollTo: '.home-map' },
  { name: 'scrolled gallery', path: '/fotos', scrollTo: '.gallery-photo:nth-child(3)' },
]) {
  test(`menu keeps the document black behind clipped Safari chrome over ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(path)
    if (scrollTo) await page.locator(scrollTo).evaluate(el => el.scrollIntoView())
    await expect.poll(() => coloredPixelsInBottomStrip(page)).toBeGreaterThan(100)
    const before = await page.evaluate(() => ({ y: scrollY, height: document.documentElement.scrollHeight }))
    await page.getByRole('button', { name: 'Menü öffnen' }).click()
    const dialog = page.getByRole('dialog', { name: 'Menü', exact: true })
    // Model Safari clipping fixed layers at the top of its translucent toolbar.
    // The exposed document must itself be black, regardless of dialog height.
    await dialog.evaluate(el => el.style.clipPath = `inset(0 0 ${el.getBoundingClientRect().bottom - innerHeight + 120}px 0)`)
    expect(await coloredPixelsInBottomStrip(page)).toBe(0)
    expect(await page.evaluate(() => ({ y: scrollY, height: document.documentElement.scrollHeight }))).toEqual(before)
    await expect(page.locator('.nav13-panel-bar')).toHaveCSS('background-color', 'rgb(255, 255, 0)')
    await expect(dialog.getByRole('link', { name: 'FOTOS', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect.poll(() => coloredPixelsInBottomStrip(page)).toBeGreaterThan(100)
    expect(await page.evaluate(() => ({ y: scrollY, height: document.documentElement.scrollHeight }))).toEqual(before)
  })
}


for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
  test(`original mobile menu stays centered with black coverage behind browser chrome at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.evaluate(height => {
      document.documentElement.style.setProperty('--safe-top', '59px')
      document.documentElement.style.setProperty('--safe-bottom', '34px')
      document.documentElement.style.setProperty('--viewport-height', `${height}px`)
    }, viewport.height - 100)
    await page.getByRole('button', { name: 'Menü öffnen' }).click()
    const dialog = page.getByRole('dialog')
    const header = page.locator('.nav13-panel-bar')
    await expect(header).toHaveCSS('background-color', 'rgb(255, 255, 0)')
    await expect(header).toHaveCSS('color', 'rgb(0, 0, 0)')
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffff00')
    const backing = await dialog.boundingBox()
    expect(backing.y + backing.height).toBeGreaterThanOrEqual(viewport.height + 34)
    const links = dialog.getByRole('navigation', { name: 'Mobile Seitennavigation' })
    await expect(links.getByRole('link')).toHaveCount(4)
    await expect(dialog.getByRole('link', { name: 'START', exact: true })).toHaveCount(0)
    await expectCentered(links, page)
    await expect(links).toHaveCSS('font-weight', '800')
    const textBox = await links.boundingBox()
    const headerBox = await header.boundingBox()
    const reservationTop = viewport.height - 100 - 34 - 68
    expect(Math.abs(textBox.y + textBox.height / 2 - (headerBox.y + headerBox.height + reservationTop) / 2)).toBeLessThanOrEqual(2)
    await page.keyboard.press('Escape')
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 0)')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffff00')
  })
}
