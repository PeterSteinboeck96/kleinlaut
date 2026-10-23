import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import drinksPdf from '@/assets/pdfs/kleinlaut.pdf'
import '../styles/pages.css'
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
  const controls = [
    ...event.currentTarget.querySelectorAll('a[href], button:not([disabled])'),
    ...document.querySelectorAll('iframe.molzait'),
  ]
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

function applyMenuTheme() {
  const root = document.documentElement
  const wasOpen = root.classList.contains('navigation-open')
  const theme = document.querySelector('meta[name="theme-color"]')
  const previousColor = theme?.getAttribute('content')
  root.classList.add('navigation-open')
  theme?.setAttribute('content', '#000000')
  return () => {
    root.classList.toggle('navigation-open', wasOpen)
    if (theme && previousColor !== null) theme.setAttribute('content', previousColor)
  }
}

export default function Navigation13() {
  const { pathname } = useLocation()
  const isMenuPage = pathname === '/menu'
  const [open, setOpen] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const desktopRef = useRef(null)
  const destinationRef = useRef(null)
  const previousOverflowRef = useRef(null)
  const inertElementsRef = useRef([])
  const restoreThemeRef = useRef(null)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  function restorePage() {
    restoreThemeRef.current?.()
    restoreThemeRef.current = null
    for (const [element, wasInert] of inertElementsRef.current) element.inert = wasInert
    inertElementsRef.current = []
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
    restorePage()
    const destination = destinationRef.current
    destinationRef.current = null
    if (destination !== null) {
      navigate(destination)
    } else {
      const target = window.matchMedia('(min-width: 1024px)').matches ? desktopRef.current : triggerRef.current
      target?.focus({ preventScroll: true })
    }
  }

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    previousOverflowRef.current = document.body.style.overflow
    restoreThemeRef.current = applyMenuTheme()
    // A non-modal dialog lets the provider iframe keep its own foreground layer.
    const header = dialog.closest('header')
    const background = [...header.parentElement.children].filter(element => element !== header)
    background.push(header.querySelector('.nav13-bar'))
    inertElementsRef.current = background.map(element => [element, element.inert])
    for (const element of background) element.inert = true
    dialog.show()
    document.body.style.overflow = 'hidden'
  }, [open])

  useEffect(() => {
    if (isMenuPage) return applyMenuTheme()
  }, [isMenuPage])

  // Keep scrolling locked throughout the exit animation, and restore on unmount.
  useEffect(() => () => restorePage(), [])

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
        {isMenuPage ? <Link to="/" className="nav13-toggle font-display">START</Link> : <>
          <button ref={triggerRef} className="nav13-toggle nav13-mobile font-display" type="button" onClick={event => { setKeyboardFocus(event.detail === 0); setOpen(true) }} aria-expanded={open} aria-controls="nav13-menu" aria-label="Menü öffnen">MENU</button>
          <Link ref={desktopRef} className="nav13-toggle nav13-desktop font-display" to="/menu">MENU</Link>
        </>}
      </nav>
      <dialog ref={dialogRef} id="nav13-menu" className="nav13-dialog" aria-label="Menü" onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); closeMenu() }
        else keepFocusInMenu(event)
      }} onCancel={event => { event.preventDefault(); closeMenu() }}>
        <div className="nav13-panel-bar">
          <button autoFocus className="nav13-toggle font-display" type="button" onClick={() => closeMenu('/')} aria-label="Zur Startseite">START</button>
        </div>
        <div className="nav13-menu-viewport">
          <div className="nav13-panel">
            <AnimatePresence onExitComplete={finishClose}>
              {open && <motion.nav key="menu-links" className="nav13-menu-links menu-links font-display" aria-label="Mobile Seitennavigation" initial="hidden" animate="visible" exit="exit" variants={{
                hidden: {},
                visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
                exit: { transition: { staggerChildren: reduceMotion ? 0 : 0.03 } },
              }}>
                {links.map(item => <NavLink key={item.label} item={item} onClick={event => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                  // Keep the menu mounted until its text has finished animating out.
                  if (item.to) event.preventDefault()
                  closeMenu(item.to ?? null)
                }} className="nav13-menu-link" variants={{
                  hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 26 },
                  visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.5, ease: EASE } },
                  exit: { opacity: 0, y: reduceMotion ? 0 : -12, transition: { duration: reduceMotion ? 0 : 0.2, ease: EASE } },
                }}>
                  <span className="font-display">{item.label}</span>
                </NavLink>)}
              </motion.nav>}
            </AnimatePresence>
          </div>
        </div>
      </dialog>
    </header>
  )
}
