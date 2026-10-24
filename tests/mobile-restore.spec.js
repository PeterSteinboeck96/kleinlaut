import { test, expect } from '@playwright/test'
import { modelLargeViewport } from './helpers/mobile-display.js'

test.use({ hasTouch: true, isMobile: true, locale: 'de-AT' })

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ body: '', contentType: 'text/plain' }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 430, height: 782 })
  await modelLargeViewport(page, 873)
  await page.addInitScript(() => {
    window.testBrowser = { height: 782, hidden: false, scale: 1, width: 430, screenHeight: 932 }
    Object.defineProperty(screen, 'width', { get: () => window.testBrowser.width })
    Object.defineProperty(screen, 'height', { get: () => window.testBrowser.screenHeight })
    Object.defineProperty(screen.orientation, 'type', { get: () => 'portrait-primary' })
    Object.defineProperty(visualViewport, 'height', { get: () => window.testBrowser.height })
    Object.defineProperty(visualViewport, 'scale', { get: () => window.testBrowser.scale })
    Object.defineProperty(document, 'hidden', { get: () => window.testBrowser.hidden })
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('--safe-bottom', '34px')
    })
  })
})

async function launcher(page) {
  await page.evaluate(() => {
    const frame = document.createElement('iframe')
    frame.className = 'molzait'
    frame.title = 'Reservation fixture'
    frame.srcdoc = '<!doctype html><button>Reserve</button>'
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:225px;height:70px;border:0'
    document.body.append(frame)
  })
  const frame = page.locator('iframe.molzait')
  await expect(frame).toHaveAttribute('data-stable-launcher', '')
  return frame
}

async function geometry(page) {
  return page.evaluate(() => {
    const box = selector => {
      const { top, height } = document.querySelector(selector).getBoundingClientRect()
      return { top, height }
    }
    return {
      photo: box('.home-hero-background img'), logo: box('.home-logo'),
      contact: box('.home-contact'), widget: box('iframe.molzait'),
    }
  })
}

for (const shrinkLayout of [false, true]) {
  test(`an actual reload during pull-to-refresh preserves the established layout (CSS shrinks: ${shrinkLayout})`, async ({ page }) => {
    await page.goto('/')
    await launcher(page)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(700)
    const initial = await geometry(page)

    // These scripts run in the NEW document. A pageshow event in the old one
    // would leave the old in-memory measurements alive and miss this bug.
    await page.addInitScript(() => { window.testBrowser.height = 450 })
    if (shrinkLayout) await page.setViewportSize({ width: 430, height: 450 })
    await page.reload()
    await launcher(page)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(800)
    expect(await geometry(page)).toEqual(initial)

    await page.evaluate(() => {
      window.testBrowser.height = 782
      visualViewport.dispatchEvent(new Event('resize'))
    })
    await page.setViewportSize({ width: 430, height: 782 })
    expect(await geometry(page)).toEqual(initial)
  })
}

test('a first visit does not use a transient visual height instead of the small CSS viewport', async ({ page }) => {
  await page.addInitScript(() => { window.testBrowser.height = 450 })
  await page.goto('/')
  const frame = await launcher(page)
  await page.waitForTimeout(800)
  expect((await frame.boundingBox()).y).toBe(712)
  const initial = await geometry(page)
  await page.evaluate(() => {
    window.testBrowser.height = 782
    visualViewport.dispatchEvent(new Event('resize'))
  })
  expect(await geometry(page)).toEqual(initial)
})

test('a cold Safari visit with no reliable small CSS viewport recovers from a collapsed initial height', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 873 })
  await page.addInitScript(() => { window.testBrowser.height = 450 })
  await page.goto('/')
  const frame = await launcher(page)
  await page.waitForTimeout(800)
  for (const height of [620, 700, 750, 782]) {
    await page.evaluate(height => {
      window.testBrowser.height = height
      visualViewport.dispatchEvent(new Event('resize'))
    }, height)
    await page.waitForTimeout(80)
  }
  await expect.poll(async () => (await frame.boundingBox()).y).toBe(712)
  expect((await page.locator('.home-map').boundingBox()).y).toBe(873)
})

test('a cold restore does not freeze a viewport taller than the physical screen', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 1050 })
  await page.addInitScript(() => {
    window.testCoverHeight = 1141
    window.testBrowser.height = 1050
  })
  await page.goto('/')
  const frame = await launcher(page)
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    window.testBrowser.height = 782
    visualViewport.dispatchEvent(new Event('resize'))
  })
  await expect.poll(async () => (await frame.boundingBox()).y).toBe(712)
  expect((await page.locator('.home-map').boundingBox()).y).toBe(873)
})

test('a first visit can finish settling when overscroll ends without another resize', async ({ page }) => {
  await page.addInitScript(() => {
    window.testBrowser.offset = 180
    Object.defineProperty(visualViewport, 'offsetTop', { get: () => window.testBrowser.offset })
  })
  await page.goto('/')
  await launcher(page)
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    window.testBrowser.offset = 0
    visualViewport.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-viewport-height'))).toBe('782px')
})

test('a height collapse during startup cannot replace the first valid anchor', async ({ page }) => {
  await page.goto('/')
  const frame = await launcher(page)
  await page.evaluate(() => {
    window.testBrowser.height = 700
    visualViewport.dispatchEvent(new Event('resize'))
  })
  await page.waitForTimeout(700)
  expect((await frame.boundingBox()).y).toBe(712)
})

test('blocked browser storage does not break cold mobile layout measurement', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } })
    window.testBrowser.height = 450
  })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const frame = await launcher(page)
  await page.waitForTimeout(700)
  expect((await frame.boundingBox()).y).toBe(712)
  expect(errors).toEqual([])
})

test('reload preserves the photo and anchors even while all live heights and offsets are wrong', async ({ page }) => {
  await page.goto('/')
  await launcher(page)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
  const initial = await geometry(page)
  await page.addInitScript(() => {
    window.testCoverHeight = 450
    window.testBrowser.height = 450
    window.testBrowser.offset = 180
    Object.defineProperty(visualViewport, 'offsetTop', { get: () => window.testBrowser.offset })
  })
  await page.setViewportSize({ width: 430, height: 450 })
  await page.reload()
  await launcher(page)
  await page.evaluate(() => document.fonts.ready)
  expect(await geometry(page)).toEqual(initial)
  await page.evaluate(() => {
    window.testBrowser.offset = 0
    window.testBrowser.height = 782
    document.documentElement.style.setProperty('--large-viewport-height', '873px')
    visualViewport.dispatchEvent(new Event('resize'))
  })
  await page.setViewportSize({ width: 430, height: 782 })
  expect(await geometry(page)).toEqual(initial)
})

test('corrupt saved dimensions are ignored rather than breaking a later visit', async ({ page }) => {
  await page.goto('/')
  await launcher(page)
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find(key => key.startsWith('kleinlaut:mobile-layout:'))
    sessionStorage.setItem(key, JSON.stringify({ height: -450, bottom: 0, cover: 873 }))
  })
  await page.reload()
  const frame = await launcher(page)
  expect((await frame.boundingBox()).y).toBe(712)
  expect((await page.locator('.home-map').boundingBox()).y).toBe(873)
})

test('home photo, text and launcher share stable geometry as Safari controls change', async ({ page }) => {
  await page.goto('/')
  await launcher(page)
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-safe-bottom'))).toBe('0px')
  const initial = await geometry(page)
  for (const height of [850, 1000, 782]) {
    await page.evaluate(height => { window.testBrowser.height = height }, height)
    await page.setViewportSize({ width: 430, height })
    await page.evaluate(height => {
      document.documentElement.style.setProperty('--safe-bottom', height === 782 ? '34px' : '0px')
      visualViewport.dispatchEvent(new Event('resize'))
    }, height)
    await expect.poll(() => geometry(page)).toEqual(initial)
  }
  const map = await page.locator('.home-map').boundingBox()
  expect(map.y).toBe(873)
  expect(initial.photo.top + initial.photo.height).toBe(map.y)
  expect(initial.widget.top + initial.widget.height).toBe(782)
})

test('a cold Safari restore with oversized CSS viewport uses the visible area', async ({ page }) => {
  // CSS vh/svh/lvh are too large, while the visible viewport is still 782px.
  await page.setViewportSize({ width: 430, height: 1050 })
  await page.addInitScript(() => { window.testCoverHeight = 1141 })
  await page.goto('/')
  const frame = await launcher(page)
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-viewport-height'))).toBe('782px')
  await expect.poll(async () => (await frame.boundingBox()).y).toBe(712)
  expect((await page.locator('.home-map').boundingBox()).y).toBe(873)
  expect((await page.locator('.home-hero-content').boundingBox()).y +
    (await page.locator('.home-hero-content').boundingBox()).height).toBe(782)
  await page.evaluate(() => { window.testBrowser.height = 752; window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })) })
  await expect.poll(async () => (await frame.boundingBox()).y).toBe(712)
})

test('Safari can report the large CSS viewport for svh without shortening the photo', async ({ page }) => {
  // The page also paints behind Safari's 91px translucent bottom controls.
  // Both CSS probes can report 873px while visualViewport reports only 782px.
  await page.setViewportSize({ width: 430, height: 873 })
  await page.goto('/')
  const frame = await launcher(page)
  const photo = await page.locator('.home-hero-background img').boundingBox()
  expect(photo.y + photo.height).toBe(873)
  expect((await page.locator('.home-map').boundingBox()).y).toBe(873)
  // The visible height already excludes the lower browser UI and safe area.
  await expect.poll(async () => (await frame.boundingBox()).y).toBe(712)
  const initial = await geometry(page)
  for (const height of [620, 782, 873, 782]) {
    await page.evaluate(height => {
      window.dispatchEvent(new Event('touchstart'))
      window.testBrowser.height = height
      visualViewport.dispatchEvent(new Event('resize'))
    }, height)
    expect(await geometry(page)).toEqual(initial)
  }
  await page.evaluate(() => scrollTo(0, 1))
  await expect(page.locator('.home-map')).toBeInViewport()
})

test('a full viewport still protects the home indicator when there is no browser toolbar', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 873 })
  await page.addInitScript(() => { window.testBrowser.height = 873 })
  await page.goto('/')
  const frame = await launcher(page)
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-safe-bottom'))).toBe('34px')
  expect((await frame.boundingBox()).y).toBe(873 - 34 - 70)
  expect((await page.locator('.home-map').boundingBox()).y).toBe(873)
})

test('pull-to-refresh and its rebound cannot replace the initial anchors', async ({ page }) => {
  await page.goto('/')
  await launcher(page)
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-safe-bottom'))).toBe('0px')
  const initial = await geometry(page)
  await page.evaluate(() => {
    window.dispatchEvent(new Event('touchstart'))
    window.testBrowser.offset = 180
    Object.defineProperty(visualViewport, 'offsetTop', { get: () => window.testBrowser.offset })
    window.testBrowser.height = 620
    visualViewport.dispatchEvent(new Event('resize'))
  })
  expect(await geometry(page)).toEqual(initial)
  // Safari can publish more short heights after the finger has been released.
  for (const height of [620, 700, 782, 850, 782]) {
    await page.evaluate(height => {
      window.testBrowser.offset = 0
      window.testBrowser.height = height
      visualViewport.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('resize'))
    }, height)
    expect(await geometry(page)).toEqual(initial)
  }
  await page.waitForTimeout(700)
  expect(await geometry(page)).toEqual(initial)
  expect(initial.widget.top + initial.widget.height).toBe(782)
})

test('height-only changes after startup are ignored even without a touch event', async ({ page }) => {
  await page.goto('/')
  await launcher(page)
  await page.waitForTimeout(700)
  const initial = await geometry(page)
  await page.evaluate(() => {
    window.testBrowser.height = 700
    visualViewport.dispatchEvent(new Event('resize'))
  })
  expect(await geometry(page)).toEqual(initial)
})

test('a loading reservation frame cannot delay the initial viewport measurement', async ({ page }) => {
  await page.addInitScript(() => {
    if (window !== window.top) return
    const observer = new MutationObserver(() => {
      if (!document.body) return
      observer.disconnect()
      const frame = document.createElement('iframe')
      frame.className = 'molzait'
      frame.srcdoc = '<button>Reserve</button>'
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:225px;height:0px;border:0'
      document.body.append(frame)
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await page.goto('/')
  const frame = page.locator('iframe.molzait')
  await expect(frame).not.toHaveAttribute('data-stable-launcher')
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-viewport-height'))).toBe('782px')
  await page.evaluate(() => {
    window.dispatchEvent(new Event('touchstart'))
    window.testBrowser.height = 620
    visualViewport.dispatchEvent(new Event('resize'))
    document.querySelector('iframe.molzait').style.height = '70px'
  })
  await expect(frame).toHaveAttribute('data-stable-launcher', '')
  await expect.poll(async () => (await frame.boundingBox()).y).toBe(712)
  await page.evaluate(() => {
    window.testBrowser.height = 782
    visualViewport.dispatchEvent(new Event('resize'))
  })
  await expect.poll(async () => (await frame.boundingBox()).y).toBe(712)
})

test('tab restoration corrects a phantom scroll only when home was left at the top', async ({ page }) => {
  await page.goto('/')
  await launcher(page)
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-safe-bottom'))).toBe('0px')
  const initial = await geometry(page)
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    window.testBrowser.hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    scrollTo(0, 59)
  })
  await page.setViewportSize({ width: 430, height: 1050 })
  await page.evaluate(() => {
    window.testBrowser.hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  })
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await expect.poll(() => geometry(page)).toEqual(initial)

  // Returning focus is also a recovery signal if a WebView omits pageshow.
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    scrollTo(0, 59)
    window.dispatchEvent(new Event('focus'))
  })
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)

  // A visitor returning from the map must keep their intentional scroll position.
  await page.setViewportSize({ width: 430, height: 782 })
  await page.evaluate(() => {
    window.dispatchEvent(new Event('touchstart'))
    scrollTo(0, 600)
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  })
  await page.waitForTimeout(700)
  expect(await page.evaluate(() => scrollY)).toBe(600)

  // A gesture after returning takes precedence over delayed restoration repairs.
  await page.evaluate(() => {
    scrollTo(0, 0)
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    window.dispatchEvent(new Event('touchstart'))
    scrollTo(0, 500)
  })
  await page.waitForTimeout(700)
  expect(await page.evaluate(() => scrollY)).toBe(500)
})

test('keyboard and pinch zoom cannot poison the saved mobile geometry', async ({ page }) => {
  await page.goto('/')
  const frame = await launcher(page)
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-safe-bottom'))).toBe('0px')
  const initial = await geometry(page)
  await frame.evaluate(element => { element.style.height = '100%'; element.style.width = '100%' })
  await expect(frame).not.toHaveAttribute('data-stable-launcher')
  await page.evaluate(() => {
    window.testBrowser.height = 400
    visualViewport.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  })
  await page.waitForTimeout(700)
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-viewport-height'))).toBe('782px')
  await frame.evaluate(element => { element.style.height = '70px'; element.style.width = '225px' })
  await expect(frame).toHaveAttribute('data-stable-launcher', '')
  await page.evaluate(() => {
    window.testBrowser.scale = 2
    visualViewport.dispatchEvent(new Event('resize'))
  })
  expect(await geometry(page)).toEqual(initial)
  await page.evaluate(() => {
    window.testBrowser.height = 782
    window.testBrowser.scale = 1
    visualViewport.dispatchEvent(new Event('resize'))
  })
  await expect.poll(() => geometry(page)).toEqual(initial)
})

test('short phones keep contact text above the launcher without a minimum-height overflow', async ({ page }) => {
  await page.addInitScript(() => { window.testCoverHeight = 548 })
  await page.addInitScript(() => Object.assign(window.testBrowser, { width: 320, screenHeight: 568, height: 418 }))
  await page.setViewportSize({ width: 320, height: 418 })
  await page.goto('/')
  const frame = await launcher(page)
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue('--stable-safe-bottom'))).toBe('0px')
  const textBottom = await page.locator('.home-contact').evaluate(element => {
    const range = document.createRange()
    range.selectNodeContents(element)
    return range.getBoundingClientRect().bottom
  })
  expect((await frame.boundingBox()).y - textBottom).toBeGreaterThanOrEqual(24)
  expect((await page.locator('.home-map').boundingBox()).y).toBe(548)
})
