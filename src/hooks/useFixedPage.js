import { useLayoutEffect, useRef } from 'react'

export default function useFixedPage() {
  const pageRef = useRef(null)

  useLayoutEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    root.classList.add('fixed-page-open')

    function updateHeight() {
      // Webviews can expose less space than 100dvh. Preserve deliberate pinch zoom.
      if (viewport && viewport.scale !== 1) return
      const height = Math.min(window.innerHeight, viewport?.height || window.innerHeight)
      if (height > 0) pageRef.current.style.setProperty('--fixed-page-height', `${height}px`)
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    window.addEventListener('pageshow', updateHeight)
    viewport?.addEventListener('resize', updateHeight)
    return () => {
      root.classList.remove('fixed-page-open')
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('pageshow', updateHeight)
      viewport?.removeEventListener('resize', updateHeight)
    }
  }, [])

  return pageRef
}
