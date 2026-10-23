import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import AnimatedMenuLinks from '../components/AnimatedMenuLinks.jsx'
import TopBar from '../components/TopBar.jsx'
import '../styles/pages.css'

export default function MenuPage() {
  const [destination, setDestination] = useState(null)
  const navigate = useNavigate()

  function closeMenu(path) {
    setDestination(current => current ?? path)
  }

  return (
    <section className="site-page menu-page">
      <TopBar onBack={() => closeMenu('/')} />
      <div className="page-panel">
        <AnimatePresence onExitComplete={() => {
          if (destination !== null) navigate(destination)
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
