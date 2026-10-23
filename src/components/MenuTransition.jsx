import { createContext, useContext, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import '../styles/navigation.css'

const MenuTransitionContext = createContext(null)

export function useMenuTransition() {
  return useContext(MenuTransitionContext)
}

export default function MenuTransition({ children }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [revealId, setRevealId] = useState(null)
  const nextId = useRef(0)

  function revealPage(destination = null) {
    // Mount the cover and destination together, after the menu text has exited.
    // Keeping this above the routes also covers returns to the current page.
    setRevealId(++nextId.current)
    if (destination !== null) navigate(destination)
  }

  return (
    <MenuTransitionContext.Provider value={{ revealPage, isRevealing: revealId !== null }}>
      {children}
      {revealId !== null && <motion.div key={revealId} className="menu-reveal" aria-hidden="true"
        initial={{ opacity: 1 }} animate={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.15, ease: 'easeOut' }}
        onAnimationComplete={() => setRevealId(current => current === revealId ? null : current)}
      />}
    </MenuTransitionContext.Provider>
  )
}
