import { test, expect } from '@playwright/test'
import { modelLargeViewport } from './helpers/mobile-display.js'

test.use({ hasTouch: true, isMobile: true })

for (const language of ['de-AT', 'en-GB']) {
  test.describe(language, () => {
    test.use({ locale: language })
    for (const [width, height] of [[320, 330], [320, 372], [320, 418], [360, 480], [375, 547], [390, 664]]) {
      test(`pages keep their content clear of the header and widget at ${width}×${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await modelLargeViewport(page, height + 80)
        await page.addInitScript(({ width, height }) => {
          // Changing native browser controls does not resize the physical screen.
          Object.defineProperty(screen, 'width', { get: () => width })
          Object.defineProperty(screen, 'height', { get: () => height + 160 })
        }, { width, height })
        await page.route('https://**/*', r => r.fulfill({ body: '', contentType: 'text/plain' }))
        for (const path of ['/', '/fotos', '/raumplan', '/impressum']) {
          await page.setViewportSize({ width, height })
          await page.goto(path)
          await page.evaluate(() => {
            const frame = document.createElement('iframe')
            frame.className = 'molzait'
            frame.srcdoc = '<button>Reserve</button>'
            frame.style.cssText = 'position:fixed;right:0;bottom:0;width:225px;height:70px;border:0'
            document.body.append(frame)
            return document.fonts.ready
          })
          await expect(page.locator('iframe.molzait')).toHaveAttribute('data-stable-launcher', '')
          const header = await page.locator('header').boundingBox()
          const widget = await page.locator('iframe.molzait').boundingBox()
          expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
          expect(widget.y + widget.height).toBeLessThanOrEqual(height)
          const assertFits = async locator => {
            const box = await locator.boundingBox()
            expect(box.y).toBeGreaterThanOrEqual(header.height)
            expect(box.y + box.height).toBeLessThanOrEqual(widget.y)
            expect(box.x).toBeGreaterThanOrEqual(0)
            expect(box.x + box.width).toBeLessThanOrEqual(width)
          }
          if (path === '/') {
            await assertFits(page.locator('.home-logo'))
            await assertFits(page.locator('.home-hours'))
            const contact = await page.locator('.home-contact').evaluate(element => {
              const range = document.createRange()
              range.selectNodeContents(element)
              return range.getBoundingClientRect().toJSON()
            })
            const hours = await page.locator('.home-hours').boundingBox()
            expect(contact.y).toBeGreaterThan(hours.y + hours.height)
            expect(contact.bottom + 12).toBeLessThanOrEqual(widget.y)
            expect((await page.locator('.home-map').boundingBox()).y).toBe(height + 80)
          } else if (path === '/fotos') {
            if (language === 'de-AT') await assertFits(page.locator('.gallery-caption > span'))
            else await expect(page.locator('.gallery-caption')).toHaveCount(0)
          } else {
            await assertFits(page.locator(path === '/raumplan' ? '.floorplan-image' : '.imprint-details'))
            await page.evaluate(() => scrollTo(0, 500))
            expect(await page.evaluate(() => scrollY)).toBe(0)
          }
          for (const extraHeight of [0, 100]) {
            // The toolbar retracts, but content must still avoid the fixed launcher.
            await page.setViewportSize({ width, height: height + extraHeight })
            expect(await page.locator('iframe.molzait').boundingBox()).toEqual(widget)
            if (path === '/raumplan' || path === '/impressum') {
              await assertFits(page.locator(path === '/raumplan' ? '.floorplan-image' : '.imprint-details'))
            }
            await page.locator('.nav13-toggle.nav13-mobile').click()
            const links = page.locator('.nav13-menu-link')
            await expect(links).toHaveCount(4)
            for (const link of await links.all()) {
              await link.scrollIntoViewIfNeeded()
              await assertFits(link)
            }
            await page.keyboard.press('Escape')
            await expect(page.locator('.nav13-dialog')).not.toBeVisible()
          }
        }
      })
    }
  })
}
