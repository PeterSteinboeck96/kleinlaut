import { useId, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { copy } from '../i18n.js'
import '../styles/portrait-notice.css'

const touch = window.matchMedia('(hover: none) and (pointer: coarse)')

function needsPortrait() {
  if (!touch.matches || Math.min(screen.width, screen.height) >= 768) return false
  // Viewport aspect ratio also changes when a keyboard opens. Use the actual
  // device orientation so a portrait reservation form never gets covered.
  if (screen.orientation?.type) return screen.orientation.type.startsWith('landscape')
  if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90
  return screen.width > screen.height
}

function subscribe(callback) {
  touch.addEventListener('change', callback)
  screen.orientation?.addEventListener('change', callback)
  window.addEventListener('orientationchange', callback)
  window.addEventListener('resize', callback)
  window.addEventListener('pageshow', callback)
  return () => {
    touch.removeEventListener('change', callback)
    screen.orientation?.removeEventListener('change', callback)
    window.removeEventListener('orientationchange', callback)
    window.removeEventListener('resize', callback)
    window.removeEventListener('pageshow', callback)
  }
}

export default function PortraitNotice() {
  const visible = useSyncExternalStore(subscribe, needsPortrait)
  const noticeRef = useRef(null)
  const titleId = useId()

  useLayoutEffect(() => {
    if (!visible) return
    const root = document.documentElement
    const app = document.getElementById('app')
    const previousFocus = document.activeElement
    const wasInert = app.inert
    const { scrollX, scrollY } = window
    root.style.setProperty('--portrait-scroll-top', `${-scrollY}px`)
    root.classList.add('portrait-required')
    app.inert = true
    noticeRef.current.focus({ preventScroll: true })
    return () => {
      app.inert = wasInert
      root.classList.remove('portrait-required')
      root.style.removeProperty('--portrait-scroll-top')
      window.scrollTo(scrollX, scrollY)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [visible])

  return visible && createPortal(
    <aside ref={noticeRef} className="portrait-notice" role="dialog" aria-modal="true"
      aria-labelledby={titleId} tabIndex={-1}>
      <div>
        <svg viewBox="0 0 40 64" aria-hidden="true" focusable="false">
          <rect x="5" y="3" width="30" height="58" rx="5" />
          <path d="M15 9h10M17 54h6" />
        </svg>
        <h2 id={titleId} className="font-display">{copy.portraitTitle}</h2>
        <p>{copy.portraitMessage}</p>
      </div>
    </aside>, document.body,
  )
}
