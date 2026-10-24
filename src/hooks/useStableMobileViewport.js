import { useLayoutEffect } from 'react'

export default function useStableMobileViewport() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const touch = window.matchMedia('(hover: none) and (pointer: coarse)')
    const viewport = window.visualViewport
    const sizes = new Map()
    const timers = new Set()
    const probe = document.createElement('div')
    probe.ariaHidden = 'true'
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;padding-bottom:var(--safe-bottom);box-sizing:content-box;visibility:hidden;pointer-events:none'
    document.body.append(probe)
    let suspendedAtHomeTop = false
    let suspended = false
    let restoreHomeTop = false

    function pageIsLocked() {
      return root.matches('.portrait-required, .fixed-page-open, .navigation-open')
    }

    function update() {
      if (!touch.matches) {
        root.style.removeProperty('--stable-viewport-height')
        root.style.removeProperty('--stable-safe-bottom')
        return
      }
      if (suspended || document.hidden || (viewport && viewport.scale !== 1)) return
      // Never store keyboard geometry, including the provider's cross-origin form.
      if (document.activeElement?.matches('input, textarea, select, [contenteditable="true"], iframe') ||
        document.querySelector('iframe.molzait:not([data-stable-launcher])')) return

      const width = root.clientWidth
      const key = `${width}:${screen.width}x${screen.height}`
      const previous = sizes.get(key)
      const style = getComputedStyle(probe)
      const heights = [parseFloat(style.height), window.innerHeight, viewport?.height]
        .filter(height => Number.isFinite(height) && height > 0)
      if (!heights.length) return
      const measured = Math.min(...heights)
      // Some WebViews do not expose keyboard focus. A large height-only collapse
      // must not become the permanent anchor for this display width.
      if (previous && measured < previous.height * 0.75) return
      const height = Math.min(previous?.height ?? measured, measured)
      const bottom = Math.max(previous?.bottom ?? 0, parseFloat(style.paddingBottom) || 0)
      sizes.set(key, { height, bottom })
      // Keep actual pixels, not a live svh expression: WebKit can recalculate all
      // viewport units during tab restoration and when its browser bars retract.
      root.style.setProperty('--stable-viewport-height', `${height}px`)
      root.style.setProperty('--stable-safe-bottom', `${bottom}px`)
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
    }
    function resume() { suspended = false; settle(suspendedAtHomeTop) }
    function onPageShow(event) {
      if (event.persisted) resume()
      else settle(restoreHomeTop)
    }
    function onVisibility() { document.hidden ? suspend() : resume() }
    function onInteraction() { restoreHomeTop = false; suspendedAtHomeTop = false }

    update()
    settle(Math.abs(window.scrollY) <= 1)
    window.addEventListener('resize', update)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pagehide', suspend)
    window.addEventListener('focus', resume)
    window.addEventListener('orientationchange', update)
    screen.orientation?.addEventListener('change', update)
    viewport?.addEventListener('resize', update)
    touch.addEventListener('change', update)
    document.addEventListener('visibilitychange', onVisibility)
    for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
      window.addEventListener(event, onInteraction, { passive: true })
    }
    return () => {
      clearTimers()
      probe.remove()
      window.removeEventListener('resize', update)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pagehide', suspend)
      window.removeEventListener('focus', resume)
      window.removeEventListener('orientationchange', update)
      screen.orientation?.removeEventListener('change', update)
      viewport?.removeEventListener('resize', update)
      touch.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', onVisibility)
      for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown']) window.removeEventListener(event, onInteraction)
      root.style.removeProperty('--stable-viewport-height')
      root.style.removeProperty('--stable-safe-bottom')
    }
  }, [])
}
