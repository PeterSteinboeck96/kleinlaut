import { useLayoutEffect, useRef } from 'react'

// Some mobile browsers paint the page behind toolbars beyond the CSS viewport.
// Use the screen as an additional cover minimum only for full-width touch views.
export default function useMobileScreenHeight() {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const element = ref.current
    const touchView = window.matchMedia('(hover: none) and (pointer: coarse)')

    function updateHeight() {
      const width = document.documentElement.clientWidth
      const { width: screenWidth, height: screenHeight } = window.screen
      let height = 0
      if (touchView.matches) {
        if (Math.abs(width - screenWidth) <= 1) height = screenHeight
        // Older mobile browsers can keep portrait screen dimensions on rotation.
        else if (screenWidth < screenHeight && width > window.innerHeight && Math.abs(width - screenHeight) <= 1) height = screenWidth
      }
      if (Number.isFinite(height) && height > 0) element.style.setProperty('--home-screen-height', `${height}px`)
      else element.style.removeProperty('--home-screen-height')
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    window.addEventListener('pageshow', updateHeight)
    touchView.addEventListener('change', updateHeight)
    window.screen.orientation?.addEventListener('change', updateHeight)
    return () => {
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('pageshow', updateHeight)
      touchView.removeEventListener('change', updateHeight)
      window.screen.orientation?.removeEventListener('change', updateHeight)
    }
  }, [])

  return ref
}
