import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { copy } from '../i18n.js'
import '../styles/news.css'

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const prefersReducedMotion = () => motionPreference.matches
function subscribeToMotionPreference(callback) {
  motionPreference.addEventListener('change', callback)
  return () => motionPreference.removeEventListener('change', callback)
}

export default function NewsBar() {
  const viewportRef = useRef(null)
  const messageRef = useRef(null)
  const [copies, setCopies] = useState(1)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion)

  useLayoutEffect(() => {
    if (reducedMotion) return
    const viewport = viewportRef.current
    const message = messageRef.current
    const measure = () => {
      const width = message.getBoundingClientRect().width
      if (!width) return
      // Fill even ultrawide screens; two identical groups make the loop seamless.
      const count = Math.max(1, Math.ceil(viewport.clientWidth / width))
      setCopies(count)
      viewport.style.setProperty('--news-duration', `${count * width / 45}s`)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(message)
    measure()
    return () => observer.disconnect()
  }, [reducedMotion])

  return (
    <section className="news-bar font-display" aria-label={copy.news.label}>
      {reducedMotion ? (
        <div className="news-static" tabIndex={0}>{copy.news.text}</div>
      ) : (
        <button ref={viewportRef} className="news-toggle" type="button"
          aria-label={paused ? copy.news.resume : copy.news.pause}
          aria-describedby="news-text" data-paused={paused}
          onClick={() => setPaused(value => !value)}>
          <span id="news-text" className="sr-only">{copy.news.text}</span>
          <span className="news-track" aria-hidden="true">
            {[0, 1].map(group => (
              <span className="news-group" key={group}>
                {Array.from({ length: copies }, (_, index) => (
                  <span className="news-message" key={index} ref={group === 0 && index === 0 ? messageRef : null}>
                    {copy.news.text} •
                  </span>
                ))}
              </span>
            ))}
          </span>
        </button>
      )}
    </section>
  )
}
