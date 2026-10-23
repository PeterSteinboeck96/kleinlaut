import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Keep third-party availability and overlays out of local regression tests.
  await page.route('https://**/*', (route) => route.fulfill({ body: '', contentType: 'text/plain' }))
})

test('home preserves content, contact links and responsive assets', async ({ page, isMobile }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'MENU', exact: true })).toBeVisible()
  await expect(page.getByText('Dienstag bis Samstag')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Anruf' })).toHaveAttribute('href', 'tel:+4366499224120')
  await expect(page.getByRole('link', { name: 'Mail', exact: true })).toHaveAttribute('href', 'mailto:hallo@kleinlaut.wien')
  await expect(page.getByRole('link', { name: 'DMs' })).toHaveAttribute('href', 'https://www.instagram.com/kleinlaut1070/')
  const hero = page.getByAltText('Cocktail in a dimly lit bar')
  await expect.poll(() => hero.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  expect(await hero.evaluate((img) => img.currentSrc)).toContain(isMobile ? '/hero-' : '/hero_desktop-')
  await expect(page.getByAltText('Kleinlaut on Google Maps')).toBeVisible({ visible: isMobile })
  await expect(page.locator('iframe')).toBeVisible({ visible: !isMobile })
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

test('gallery retains all photos, numeric order and responsive columns', async ({ page, isMobile }) => {
  await page.goto('/fotos')
  const photos = page.getByRole('img', { name: /^Gallery image/ })
  await expect(photos).toHaveCount(60)
  const sources = await photos.evaluateAll((images) => images.map((img) => Number(img.src.match(/\/(\d+)-/)[1])))
  expect(sources).toEqual(Array.from({ length: 60 }, (_, i) => i + 1))
  await expect.poll(() => photos.first().evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  const columns = await page.locator('.grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(isMobile ? 1 : 4)
  await expect(page.getByText('Die bunte')).toBeVisible({ visible: isMobile })
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect(page.getByRole('link', { name: 'MENU', exact: true })).toBeInViewport()
  await page.getByRole('link', { name: 'MENU', exact: true }).click()
  await expect(page.locator('body')).not.toHaveClass(/allow-scroll/)
  await page.getByRole('link', { name: 'FOTOS', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

test('all routes support direct loads and reloads without runtime errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  for (const path of ['/', '/menu', '/fotos', '/raumplan', '/impressum', '/drinks']) {
    await page.goto(path)
    await expect(page.locator('header')).toBeVisible()
    await page.reload()
    await expect(page.locator('header')).toBeVisible()
    const canScroll = ['/', '/fotos', '/drinks'].includes(path)
    for (const selector of ['body', 'html']) {
      expect(await page.locator(selector).evaluate((el) => el.classList.contains('allow-scroll'))).toBe(canScroll)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
    if (path === '/raumplan') {
      await expect.poll(() => page.getByAltText('Raumplan').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
    }
    if (path === '/impressum') await expect(page.getByText('JP Frameworks GmbH')).toBeVisible()
    if (path === '/drinks') await expect(page).toHaveURL('/')
  }
  expect(errors).toEqual([])
})
