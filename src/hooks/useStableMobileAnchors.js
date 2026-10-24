import { useLayoutEffect } from 'react'

export default function useStableMobileAnchors() {
  useLayoutEffect(() => {
    const root = document.documentElement
    let width = -1
    function updateSafeArea() {
      if (root.clientWidth === width) return
      width = root.clientWidth
      // Some browsers change safe-area-inset-bottom along with their toolbars.
      // Rebase only for a real layout-width change, not a toolbar or keyboard.
      root.style.setProperty('--stable-safe-bottom', getComputedStyle(root).getPropertyValue('--safe-bottom').trim() || '0px')
    }
    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    const frames = new Map()

    function attach(frame) {
      if (!(frame instanceof HTMLIFrameElement) || !frame.matches('.molzait') || frames.has(frame)) return
      function update() {
        // Molzait reports a compact pixel height for its button and a full
        // viewport for the form. Only the closed button gets a stable anchor.
        const height = frame.style.height
        const launcher = height.endsWith('px') && parseFloat(height) > 0 && parseFloat(height) <= 128
        frame.toggleAttribute('data-stable-launcher', launcher)
        if (launcher && frame.style.getPropertyValue('--launcher-height') !== height) {
          frame.style.setProperty('--launcher-height', height)
        }
      }
      const observer = new MutationObserver(update)
      observer.observe(frame, { attributes: true, attributeFilter: ['style'] })
      frames.set(frame, observer)
      update()
    }

    document.querySelectorAll('iframe.molzait').forEach(attach)
    // The provider can finish loading after React has mounted.
    const additions = new MutationObserver(records => {
      for (const record of records) record.addedNodes.forEach(attach)
      for (const [frame, observer] of frames) {
        if (frame.isConnected) continue
        observer.disconnect()
        frames.delete(frame)
      }
    })
    additions.observe(document.body, { childList: true })
    return () => {
      window.removeEventListener('resize', updateSafeArea)
      root.style.removeProperty('--stable-safe-bottom')
      additions.disconnect()
      for (const [frame, observer] of frames) {
        observer.disconnect()
        frame.removeAttribute('data-stable-launcher')
        frame.style.removeProperty('--launcher-height')
      }
    }
  }, [])
}
