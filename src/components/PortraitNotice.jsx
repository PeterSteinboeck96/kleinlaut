import { useId, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { copy } from '../i18n.js'
import martini from '../assets/images/portrait-martini.png'
import '../styles/portrait-notice.css'

const touch = window.matchMedia('(hover: none) and (pointer: coarse)')

function getTiltDirection() {
  if (!touch.matches || Math.min(screen.width, screen.height) >= 768) return null
  // Viewport aspect ratio also changes when a keyboard opens. Use the actual
  // device orientation so a portrait reservation form never gets covered.
  const landscape = screen.orientation?.type
    ? screen.orientation.type.startsWith('landscape')
    : typeof window.orientation === 'number'
      ? Math.abs(window.orientation % 180) === 90
      : screen.width > screen.height
  if (!landscape) return null

  // Angles describe counterclockwise device rotation: 90 = left, 270/-90 = right.
  // Primary/secondary labels alone do not reliably identify the direction.
  for (const angle of [screen.orientation?.angle, window.orientation]) {
    if (!Number.isFinite(angle)) continue
    const normalized = ((angle % 360) + 360) % 360
    if (normalized === 90) return 'left'
    if (normalized === 270) return 'right'
  }
  return 'left'
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
  const direction = useSyncExternalStore(subscribe, getTiltDirection)
  const visible = direction !== null
  const noticeRef = useRef(null)
  const titleId = useId()
  const messageId = useId()

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
      aria-labelledby={titleId} aria-describedby={messageId} tabIndex={-1}>
      <div>
        <img className={`portrait-notice__glass${direction === 'right' ? ' portrait-notice__glass--mirrored' : ''}`}
          src={martini} alt="" width="1413" height="1099" draggable={false} />
        <h2 id={titleId} className="font-display">{copy.portraitTitle}</h2>
        <p id={messageId}>{copy.portraitMessage}</p>
      </div>
    </aside>, document.body,
  )
}
