import { useEffect, useRef, useState } from 'react'
import { animate, useMotionValue } from 'motion/react'
import { useMenuTransition } from './MenuTransition.jsx'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion.js'
import '../styles/gallery-intro.css'

export default function GalleryIntro({ galleryRef, mobile }) {
  const reducedMotion = usePrefersReducedMotion()
  const { isRevealing } = useMenuTransition()
  const played = useRef(false)
  const [active, setActive] = useState(false)
  const y = useMotionValue(0)

  useEffect(() => {
    if (!mobile || reducedMotion || isRevealing || played.current) return
    const grid = galleryRef.current.querySelector('.gallery-grid')
    const photo = grid.querySelector('img')
    let cancelled = false
    let timer
    let animation
    const events = ['pointerdown', 'wheel', 'keydown', 'scroll']
    const stopUpdates = y.on('change', value => { grid.style.transform = `translateY(${value}px)` })

    function stop() {
      cancelled = true
      clearTimeout(timer)
      animation?.stop()
      stopUpdates()
      y.set(0)
      grid.style.removeProperty('transform')
      setActive(false)
      for (const event of events) window.removeEventListener(event, dismiss)
    }

    function dismiss() {
      played.current = true
      stop()
    }

    async function start() {
      try { await photo.decode() } catch { return }
      if (cancelled) return
      timer = setTimeout(async () => {
        if (window.scrollY > 0 || document.documentElement.classList.contains('navigation-open')) return
        played.current = true
        setActive(true)
        // Suggest an upward swipe without ever changing the user's scroll position.
        animation = animate(y, -28, { duration: 0.38, delay: 0.16, ease: [0.22, 1, 0.36, 1] })
        await animation
        if (cancelled) return
        animation = animate(y, 0, { type: 'spring', stiffness: 220, damping: 20, mass: 0.8 })
        await animation
        if (!cancelled) stop()
      }, 500)
    }

    for (const event of events) window.addEventListener(event, dismiss, { passive: true })
    start()
    return () => {
      stop()
    }
  }, [galleryRef, mobile, reducedMotion, isRevealing, y])

  return active ? <div className="gallery-intro-glass" aria-hidden="true" /> : null
}
