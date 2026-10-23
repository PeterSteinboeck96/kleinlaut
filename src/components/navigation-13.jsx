import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import drinksPdf from '@/assets/pdfs/kleinlaut.pdf'
import '../styles/navigation.css'

const EASE = [0.22, 1, 0.36, 1]
const links = [
  { label: 'DRINKS', href: drinksPdf },
  { label: 'FOTOS', to: '/fotos' },
  { label: 'RAUMPLAN', to: '/raumplan' },
  { label: 'IMPRESSUM', to: '/impressum' },
]
const MotionLink = motion.create(Link)

function keepFocusInMenu(event) {
  if (event.key !== 'Tab') return
  const controls = Array.from(event.currentTarget.querySelectorAll('a[href], button:not([disabled])'))
  if (!controls.length) return
  // Safari can skip links in its default tab order. Include every menu action.
  const index = controls.indexOf(document.activeElement)
  const next = (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
  event.preventDefault()
  controls[next].focus()
}

function NavLink({ item, ...props }) {
  return item.to
    ? <MotionLink to={item.to} {...props} />
    : <motion.a href={item.href} target="_blank" rel="noreferrer" {...props} />
}

function RollLink({ item, reduceMotion }) {
  return (
    <NavLink item={item} className="nav13-roll" initial="rest" animate="rest" whileHover="hover" whileFocus="hover" aria-label={item.label}>
      <span className="nav13-roll-window">
        <motion.span variants={{ rest: { y: '0%' }, hover: { y: reduceMotion ? '0%' : '-100%' } }} transition={{ duration: 0.4, ease: EASE }}>{item.label}</motion.span>
        {!reduceMotion && <motion.span aria-hidden="true" className="nav13-roll-copy" variants={{ rest: { y: '100%' }, hover: { y: '0%' } }} transition={{ duration: 0.4, ease: EASE }}>{item.label}</motion.span>}
      </span>
    </NavLink>
  )
}

export default function Navigation13() {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const brandRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = () => { if (query.matches) setOpen(false) }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return (
    <header className="top-bar nav13">
      <nav className="nav13-bar" aria-label="Hauptnavigation">
        <div className="nav13-desktop nav13-left">
          {links.slice(0, 2).map(item => <RollLink key={item.label} item={item} reduceMotion={reduceMotion} />)}
        </div>
        <button ref={triggerRef} className="nav13-icon nav13-mobile" type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="nav13-menu" aria-label="Menü öffnen"><Menu size={20} aria-hidden="true" /></button>
        <Link ref={brandRef} className="nav13-brand font-display" to="/" aria-label="Kleinlaut – Startseite">KLEINLAUT</Link>
        <div className="nav13-desktop nav13-right">
          {links.slice(2).map(item => <RollLink key={item.label} item={item} reduceMotion={reduceMotion} />)}
          <a className="nav13-contact" href="mailto:hallo@kleinlaut.wien">Kontakt <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
        <a className="nav13-icon nav13-contact nav13-mobile" href="mailto:hallo@kleinlaut.wien" aria-label="Kontakt per E-Mail"><ArrowUpRight size={20} aria-hidden="true" /></a>
      </nav>
      <dialog ref={dialogRef} id="nav13-menu" className="nav13-dialog" aria-label="Menü" onKeyDown={keepFocusInMenu} onCancel={event => { event.preventDefault(); setOpen(false) }}>
        <AnimatePresence onExitComplete={() => {
          dialogRef.current?.close()
          const target = window.matchMedia('(min-width: 1024px)').matches ? brandRef.current : triggerRef.current
          target?.focus({ preventScroll: true })
        }}>
          {open && <motion.div key="menu" className="nav13-panel" initial={reduceMotion ? false : { y: '-100%' }} animate={{ y: 0 }} exit={{ y: reduceMotion ? 0 : '-100%' }} transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}>
            <div className="nav13-panel-bar">
              <button autoFocus className="nav13-icon" type="button" onClick={() => setOpen(false)} aria-label="Menü schließen"><X size={20} aria-hidden="true" /></button>
              <Link className="nav13-brand font-display" to="/" onClick={() => setOpen(false)}>KLEINLAUT</Link>
              <span aria-hidden="true" />
            </div>
            <motion.nav className="nav13-menu-links" aria-label="Mobile Seitennavigation" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06, delayChildren: reduceMotion ? 0 : 0.2 } } }}>
              {links.map((item, index) => <NavLink key={item.label} item={item} onClick={() => setOpen(false)} className="nav13-menu-link" variants={{ hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 26 }, visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.5, ease: EASE } } }}>
                <span className="nav13-number" aria-hidden="true">0{index + 1}</span><span className="font-display">{item.label}</span><ArrowUpRight size={20} aria-hidden="true" />
              </NavLink>)}
            </motion.nav>
            <div className="nav13-footer">
              <p>Wir freuen uns auf dich.</p>
              <a href="mailto:hallo@kleinlaut.wien">hallo@kleinlaut.wien</a>
              <div className="nav13-footer-actions"><a href="tel:+4366499224120">Anrufen</a><a href="https://www.instagram.com/kleinlaut1070/" target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={16} aria-hidden="true" /></a></div>
            </div>
          </motion.div>}
        </AnimatePresence>
      </dialog>
    </header>
  )
}
