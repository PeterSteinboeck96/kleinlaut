import { Link } from 'react-router-dom'
import { motion, useIsPresent } from 'motion/react'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion.js'
import drinksPdf from '@/assets/pdfs/kleinlaut.pdf'
import { copy } from '../i18n.js'

const EASE = [0.22, 1, 0.36, 1]
const links = [
  { label: copy.links.drinks, href: drinksPdf },
  { label: copy.links.photos, to: '/fotos' },
  { label: copy.links.floorplan, to: '/raumplan' },
  { label: copy.links.legal, to: '/impressum' },
]
const MotionLink = motion.create(Link)

export default function AnimatedMenuLinks({ className = 'menu-links font-display', label = copy.pageNavigation, onSelect }) {
  const reduceMotion = usePrefersReducedMotion()
  const isPresent = useIsPresent()

  return (
    <motion.nav className={className} aria-label={label} initial="hidden" animate="visible" exit="exit" variants={{
      hidden: {},
      visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
      exit: { transition: { staggerChildren: reduceMotion ? 0 : 0.03 } },
    }}>
      {links.map(item => {
        const Component = item.to ? MotionLink : motion.a
        const destination = item.to ? { to: item.to } : { href: item.href, target: '_blank', rel: 'noreferrer' }
        return (
          <Component key={item.label} {...destination} className="nav13-menu-link" onClick={event => {
            // Exiting links stay mounted briefly; keep the first navigation choice.
            if (!isPresent) { event.preventDefault(); return }
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
            onSelect?.(event, item)
          }} variants={{
            hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 26 },
            visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.5, ease: EASE } },
            exit: { opacity: 0, y: reduceMotion ? 0 : -12, transition: { duration: reduceMotion ? 0 : 0.2, ease: EASE } },
          }}>
            <span className="font-display">{item.label}</span>
          </Component>
        )
      })}
    </motion.nav>
  )
}
