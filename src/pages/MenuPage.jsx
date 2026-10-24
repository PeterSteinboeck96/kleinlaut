import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import AnimatedMenuLinks from '../components/AnimatedMenuLinks.jsx'
import { useMenuTransition } from '../components/MenuTransition.jsx'
import TopBar from '../components/TopBar.jsx'
import '../styles/pages.css'

export default function MenuPage() {
  const [destination, setDestination] = useState(null)
  const mountedRef = useRef(false)
  const cancelledRef = useRef(false)
  const { revealPage } = useMenuTransition()

  useEffect(() => {
    mountedRef.current = true
    // History may return before React commits the destination, leaving this
    // same menu mounted. Cancel synchronously, then restore its link state.
    const onPopState = () => {
      cancelledRef.current = true
      setDestination(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => {
      mountedRef.current = false
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  function closeMenu(path) {
    cancelledRef.current = false
    setDestination(current => current ?? path)
  }

  return (
    <section className="site-page menu-page">
      <TopBar onBack={() => closeMenu('/')} />
      <div className="page-panel">
        <AnimatePresence onExitComplete={() => {
          if (mountedRef.current && !cancelledRef.current && destination !== null) revealPage(destination)
        }}>
          {destination === null && <AnimatedMenuLinks key="menu-links" onSelect={(event, item) => {
            if (!item.to) return
            event.preventDefault()
            closeMenu(item.to)
          }} />}
        </AnimatePresence>
      </div>
    </section>
  )
}
