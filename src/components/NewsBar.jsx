import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion.js'
import { copy } from '../i18n.js'
import '../styles/news.css'

function NewsTicker({ text }) {
  const viewportRef = useRef(null)
  const messageRef = useRef(null)
  const gesture = useRef({ pressed: false, dragged: false, cancelled: false, origin: 0 })
  const inertia = useRef(null)
  const [copies, setCopies] = useState(1)
  const [paused, setPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const position = useMotionValue(0)
  const groupWidth = useMotionValue(0)
  const x = useTransform(() => {
    const offset = position.get()
    const width = groupWidth.get()
    return width ? ((offset % width) + width) % width - width : 0
  })

  function stopInertia() {
    inertia.current?.stop()
    inertia.current = null
  }

  function cancelGesture() {
    gesture.current.pressed = false
    gesture.current.cancelled = true
    setDragging(false)
    stopInertia()
  }

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const message = messageRef.current
    const measure = () => {
      const width = message.getBoundingClientRect().width
      if (!width) return
      // Two identical groups cover the viewport throughout either drag direction.
      setCopies(Math.max(1, Math.ceil(viewport.clientWidth / width)))
      groupWidth.set(copies * width)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(message)
    measure()
    return () => observer.disconnect()
  }, [copies, groupWidth])

  useEffect(() => {
    const onVisibilityChange = () => { if (document.hidden) cancelGesture() }
    window.addEventListener('blur', cancelGesture)
    window.addEventListener('pagehide', cancelGesture)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('blur', cancelGesture)
      window.removeEventListener('pagehide', cancelGesture)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopInertia()
    }
  }, [])

  useAnimationFrame((_, delta) => {
    if (paused || gesture.current.pressed || inertia.current || document.hidden) return
    position.set(position.get() - 45 * Math.min(delta, 50) / 1000)
  })

  return (
    <motion.button ref={viewportRef} className="news-toggle" type="button"
      aria-label={paused ? copy.news.resume : copy.news.pause}
      aria-describedby="news-text" data-paused={paused} data-dragging={dragging}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return
        stopInertia()
        gesture.current = { pressed: true, dragged: false, cancelled: false, origin: position.get() }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerUp={() => { gesture.current.pressed = false }}
      onPointerCancel={cancelGesture}
      onPanStart={() => {
        if (!gesture.current.pressed) return
        gesture.current.dragged = true
        setDragging(true)
      }}
      onPan={(_, info) => {
        if (gesture.current.pressed) position.set(gesture.current.origin + info.offset.x)
      }}
      onPanEnd={(event, info) => {
        gesture.current.pressed = false
        setDragging(false)
        if (gesture.current.cancelled || event.type === 'pointercancel' || Math.abs(info.velocity.x) < 5) return
        // Motion's inertia uses the release velocity and exponential deceleration.
        inertia.current = animate(position, position.get() + info.velocity.x * 0.8, {
          type: 'inertia', velocity: info.velocity.x, power: 0.8, timeConstant: 500, restDelta: 0.5,
          onComplete: () => { inertia.current = null },
        })
      }}
      onClick={event => {
        if (event.detail !== 0 && (gesture.current.dragged || gesture.current.cancelled)) return
        stopInertia()
        setPaused(value => !value)
      }}
      onKeyDown={event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        stopInertia()
        setPaused(true)
        position.set(position.get() + (event.key === 'ArrowLeft' ? 120 : -120))
      }}>
      <span id="news-text" className="sr-only">{text}</span>
      <motion.span className="news-track" aria-hidden="true" style={{ x }}>
        {[0, 1].map(group => (
          <span className="news-group" key={group}>
            {Array.from({ length: copies }, (_, index) => (
              <span className="news-message" key={index} ref={group === 0 && index === 0 ? messageRef : null}>{`${text} • `}</span>
            ))}
          </span>
        ))}
      </motion.span>
    </motion.button>
  )
}

export default function NewsBar() {
  const reducedMotion = usePrefersReducedMotion()
  const text = copy.news.text.split('•').map(item => item.trim().replace(/\s+/g, ' ')).join(' • ')
  return (
    <section className="news-bar font-display" aria-label={copy.news.label}>
      {reducedMotion ? <div className="news-static" tabIndex={0}>{text}</div> : <NewsTicker text={text} />}
    </section>
  )
}
