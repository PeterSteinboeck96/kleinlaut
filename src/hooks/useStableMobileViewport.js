import { useLayoutEffect } from 'react'

const STORAGE_PREFIX = 'kleinlaut:mobile-layout:v1:'

function readSize(key) {
  try {
    const size = JSON.parse(sessionStorage.getItem(STORAGE_PREFIX + key))
    if (size && [size.height, size.bottom, size.cover].every(Number.isFinite) &&
      size.height > 0 && size.bottom >= 0 && size.bottom < size.height &&
      size.cover >= size.height && size.cover <= Math.max(screen.width, screen.height)) return size
  } catch { /* Storage can be disabled in private / embedded browsers. */ }
  return null
}

function saveSize(key, size) {
  try { sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(size)) } catch { /* Keep the in-memory anchor. */ }
}

export default function useStableMobileViewport() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const touch = window.matchMedia('(hover: none) and (pointer: coarse)')
    const viewport = window.visualViewport
    const sizes = new Map()
    const timers = new Set()
    const unsettled = new Set()
    const probe = document.createElement('div')
    probe.ariaHidden = 'true'
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;padding-bottom:var(--safe-bottom);box-sizing:content-box;visibility:hidden;pointer-events:none'
    const largeProbe = probe.cloneNode()
    largeProbe.style.height = 'var(--large-viewport-height)'
    document.body.append(probe, largeProbe)
    let suspendedAtHomeTop = false
    let suspended = false
    let restoreHomeTop = false
    let initialized = false
    let pendingSize = null
    let recoveryTimer

    function applySize({ height, bottom, cover }) {
      root.style.setProperty('--stable-viewport-height', `${height}px`)
      root.style.setProperty('--stable-large-viewport-height', `${cover}px`)
      root.style.setProperty('--stable-safe-bottom', `${bottom}px`)
    }

    function pageIsLocked() {
      return root.matches('.portrait-required, .fixed-page-open, .navigation-open')
    }

    function update() {
      if (!touch.matches) {
        root.style.removeProperty('--stable-viewport-height')
        root.style.removeProperty('--stable-large-viewport-height')
        root.style.removeProperty('--stable-safe-bottom')
        return
      }

      const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
      const key = `${root.clientWidth}:${screen.width}x${screen.height}:${devicePixelRatio}:${standalone}`
      let previous = sizes.get(key)
      if (!previous) {
        previous = readSize(key)
        if (previous) {
          sizes.set(key, previous)
          initialized = true
        }
      }
      // A reload destroys the old JS Map, even while Safari is still bouncing.
      // Restore the established pixel anchors before looking at live geometry.
      if (previous) {
        applySize(previous)
        unsettled.clear()
        if (initialized || document.querySelector('iframe.molzait:not([data-stable-launcher])')) return
      }
      if (suspended || document.hidden || window.scrollY < 0 ||
        (viewport && (viewport.scale !== 1 || Math.abs(viewport.offsetTop) > 1))) {
        if (!previous) unsettled.add(key)
        return
      }
      // Never store keyboard geometry, including the provider's cross-origin form.
      if (document.activeElement?.matches('input, textarea, select, [contenteditable="true"], iframe')) return

      const style = getComputedStyle(probe)
      const smallCssHeight = parseFloat(style.height)
      const largeCssHeight = parseFloat(getComputedStyle(largeProbe).height)
      const oversized = screen.height > 0 && largeCssHeight > screen.height
      const hasSmallViewport = CSS.supports('height', '100svh') &&
        !oversized && smallCssHeight < largeCssHeight - 1
      const heights = [smallCssHeight, window.innerHeight, viewport?.height]
        .filter(height => Number.isFinite(height) && height > 0)
      if (!heights.length) return
      // svh describes the area with browser controls expanded. visualViewport
      // can be temporarily much shorter during refresh, even on a first visit.
      const measured = hasSmallViewport ? smallCssHeight : Math.min(...heights)
      const referenceHeight = oversized ? screen.height : largeCssHeight
      // Without a saved anchor, defer an implausibly collapsed first reading.
      // Allow up to 200px (or 25% on larger displays) for native browser controls,
      // including older small phones. A later valid resize can still initialize.
      if (!previous && (measured < Math.min(referenceHeight - 200, referenceHeight * 0.75) ||
        (screen.height > 0 && measured > screen.height))) {
        unsettled.add(key)
        pendingSize = null
        clearTimeout(recoveryTimer)
        return
      }
      // Never ratchet a valid anchor downward during the startup timers.
      const height = previous?.height ?? measured
      // Safari can report the same CSS height for svh and lvh while its visible
      // viewport stops above the translucent address bar. Keep the full lvh in
      // that case. Only correct impossible, larger-than-screen restore values.
      const largeHeight = oversized && CSS.supports('height', '100svh') && largeCssHeight >= smallCssHeight
        ? measured + largeCssHeight - smallCssHeight
        : largeCssHeight
      const cover = previous?.cover ?? Math.max(height, largeHeight || height)
      // The visible viewport may already exclude the bottom safe area together
      // with Safari's toolbar. Reserve only the inset still inside that viewport.
      const bottom = Math.max(0, (parseFloat(style.paddingBottom) || 0) - (cover - height))
      const size = { height, bottom, cover }
      if (!previous && unsettled.has(key)) {
        // A rebound arrives in several resize events. After rejecting a bad
        // first reading, wait for a quiet 300ms instead of freezing its first
        // intermediate height. Established anchors never enter this path.
        if (pendingSize?.key !== key ||
          Object.keys(size).some(name => size[name] !== pendingSize.size[name])) {
          pendingSize = { key, size, since: performance.now() }
        }
        const remaining = 300 - (performance.now() - pendingSize.since)
        clearTimeout(recoveryTimer)
        if (remaining > 0) {
          recoveryTimer = setTimeout(update, remaining + 1)
          return
        }
        unsettled.clear()
        pendingSize = null
      }
      sizes.set(key, size)
      saveSize(key, size)
      // Keep actual pixels, not a live svh expression: WebKit can recalculate all
      // viewport units during tab restoration and when its browser bars retract.
      applySize(size)
    }

    function clearTimers() {
      timers.forEach(clearTimeout)
      timers.clear()
    }

    function settle(atHomeTop = false) {
      clearTimers()
      restoreHomeTop = atHomeTop && touch.matches && location.pathname === '/'
      // Safari may publish the restored geometry only after pageshow/visibility.
      for (const delay of [0, 100, 300, 600]) {
        const timer = setTimeout(() => {
          timers.delete(timer)
          update()
          if (delay === 600) initialized = true
          const headerHeight = document.querySelector('.top-bar')?.getBoundingClientRect().height || 0
          if (restoreHomeTop && location.pathname === '/' && !pageIsLocked() && Math.abs(window.scrollY) <= headerHeight) {
            window.scrollTo(0, 0)
          }
        }, delay)
        timers.add(timer)
      }
    }

    function suspend() {
      if (suspended) return
      suspended = true
      suspendedAtHomeTop = location.pathname === '/' && Math.abs(window.scrollY) <= 1 && !pageIsLocked()
      restoreHomeTop = false
      clearTimers()
      clearTimeout(recoveryTimer)
      pendingSize = null
    }
    function resume() { initialized = true; suspended = false; settle(suspendedAtHomeTop) }
    function onPageShow(event) {
      if (event.persisted) resume()
      else settle(restoreHomeTop)
    }
    function onVisibility() { document.hidden ? suspend() : resume() }
    function onViewportScroll() { if (unsettled.size) update() }
    function onInteraction() {
      initialized = true
      restoreHomeTop = false
      suspendedAtHomeTop = false
    }

    update()
    settle(Math.abs(window.scrollY) <= 1)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', onViewportScroll, { passive: true })
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pagehide', suspend)
    window.addEventListener('focus', resume)
    window.addEventListener('orientationchange', update)
    screen.orientation?.addEventListener('change', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', onViewportScroll, { passive: true })
    touch.addEventListener('change', update)
    document.addEventListener('visibilitychange', onVisibility)
    for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
      window.addEventListener(event, onInteraction, { passive: true })
    }
    return () => {
      clearTimers()
      clearTimeout(recoveryTimer)
      probe.remove()
      largeProbe.remove()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', onViewportScroll)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pagehide', suspend)
      window.removeEventListener('focus', resume)
      window.removeEventListener('orientationchange', update)
      screen.orientation?.removeEventListener('change', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', onViewportScroll)
      touch.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', onVisibility)
      for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown']) window.removeEventListener(event, onInteraction)
      root.style.removeProperty('--stable-viewport-height')
      root.style.removeProperty('--stable-large-viewport-height')
      root.style.removeProperty('--stable-safe-bottom')
    }
  }, [])
}
