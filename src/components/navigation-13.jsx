import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import drinksPdf from '@/assets/pdfs/kleinlaut.pdf'
import '../styles/navigation.css'

const EASE = [0.22, 1, 0.36, 1]
const links = [
  { label: 'START', to: '/' },
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
    <NavLink item={item} className="nav13-roll font-display" initial="rest" animate="rest" whileHover="hover" whileFocus="hover" aria-label={item.label}>
      <span className="nav13-roll-window">
        <motion.span variants={{ rest: { y: '0%' }, hover: { y: reduceMotion ? '0%' : '-100%' } }} transition={{ duration: 0.4, ease: EASE }}>{item.label}</motion.span>
        {!reduceMotion && <motion.span aria-hidden="true" className="nav13-roll-copy" variants={{ rest: { y: '100%' }, hover: { y: '0%' } }} transition={{ duration: 0.4, ease: EASE }}>{item.label}</motion.span>}
      </span>
    </NavLink>
  )
}

export default function Navigation13() {
  const [open, setOpen] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const desktopRef = useRef(null)
  const destinationRef = useRef(null)
  const previousOverflowRef = useRef(null)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  function restoreScrolling() {
    if (previousOverflowRef.current === null) return
    document.body.style.overflow = previousOverflowRef.current
    previousOverflowRef.current = null
  }

  function closeMenu(destination = null) {
    if (!open) return
    destinationRef.current = destination
    setOpen(false)
  }

  function finishClose() {
    dialogRef.current?.close()
    restoreScrolling()
    const destination = destinationRef.current
    destinationRef.current = null
    if (destination !== null) {
      navigate(destination)
    } else {
      const target = window.matchMedia('(min-width: 1024px)').matches ? desktopRef.current?.querySelector('a') : triggerRef.current
      target?.focus({ preventScroll: true })
    }
  }

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    previousOverflowRef.current = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
  }, [open])

  // Keep scrolling locked throughout the exit animation, and restore on unmount.
  useEffect(() => () => restoreScrolling(), [])

  useEffect(() => {
    const onKey = () => setKeyboardFocus(true)
    const onPointer = () => setKeyboardFocus(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = () => { if (query.matches) setOpen(false) }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return (
    <header className="top-bar nav13" data-input={keyboardFocus ? 'keyboard' : 'pointer'}>
      <nav className="nav13-bar" aria-label="Hauptnavigation">
        <button ref={triggerRef} className="nav13-toggle nav13-mobile font-display" type="button" onClick={event => { setKeyboardFocus(event.detail === 0); setOpen(true) }} aria-expanded={open} aria-controls="nav13-menu" aria-label="Menü öffnen">MENU</button>
        <div ref={desktopRef} className="nav13-desktop">
          {links.map(item => <RollLink key={item.label} item={item} reduceMotion={reduceMotion} />)}
        </div>
      </nav>
      <dialog ref={dialogRef} id="nav13-menu" className="nav13-dialog" aria-label="Menü" onKeyDown={keepFocusInMenu} onCancel={event => { event.preventDefault(); closeMenu() }}>
        <div className="nav13-panel-bar">
          <button autoFocus className="nav13-toggle font-display" type="button" onClick={() => closeMenu('/')} aria-label="Menü schließen">MENU</button>
        </div>
        <div className="nav13-menu-viewport">
          <AnimatePresence onExitComplete={finishClose}>
            {open && <motion.div key="menu" className="nav13-panel" initial={reduceMotion ? false : { y: '-100%' }} animate={{ y: 0 }} exit={{ y: reduceMotion ? 0 : '-100%' }} transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE }}>
              <motion.nav className="nav13-menu-links" aria-label="Mobile Seitennavigation" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06, delayChildren: reduceMotion ? 0 : 0.2 } } }}>
                {links.map(item => <NavLink key={item.label} item={item} onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                  // Changing routes earlier would unmount the menu before it can slide out.
                  if (item.to) event.preventDefault()
                  closeMenu(item.to ?? null)
                }} className="nav13-menu-link" variants={{ hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 26 }, visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.5, ease: EASE } } }}>
                  <span className="font-display">{item.label}</span>
                </NavLink>)}
              </motion.nav>
              <div className="nav13-footer">
                <p>Wir freuen uns auf dich.</p>
                <a href="mailto:hallo@kleinlaut.wien">hallo@kleinlaut.wien</a>
                <div className="nav13-footer-actions"><a href="tel:+4366499224120">Anrufen</a><a href="https://www.instagram.com/kleinlaut1070/" target="_blank" rel="noreferrer">Instagram</a></div>
              </div>
            </motion.div>}
          </AnimatePresence>
        </div>
      </dialog>
    </header>
  )
}
