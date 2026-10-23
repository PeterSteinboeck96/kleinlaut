import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import AnimatedMenuLinks from '../components/AnimatedMenuLinks.jsx'
import { useMenuTransition } from '../components/MenuTransition.jsx'
import TopBar from '../components/TopBar.jsx'
import '../styles/pages.css'

export default function MenuPage() {
  const [destination, setDestination] = useState(null)
  const { revealPage } = useMenuTransition()

  function closeMenu(path) {
    setDestination(current => current ?? path)
  }

  return (
    <section className="site-page menu-page">
      <TopBar onBack={() => closeMenu('/')} />
      <div className="page-panel">
        <AnimatePresence onExitComplete={() => {
          if (destination !== null) revealPage(destination)
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
