import { Link, useLocation } from 'react-router-dom'

export default function TopBar({ label = 'MENU' }) {
  const { pathname } = useLocation()
  const isFixed = pathname === '/fotos' || pathname === '/'
  const positionClass = isFixed ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
  const menuTarget = pathname === '/menu' ? '/' : '/menu'

  return (
    <header className={`${positionClass} z-50`}>
      <Link to={menuTarget} aria-label={label} className="block bg-accent py-3 text-center font-display text-base text-black">
        <span className="inline-flex items-center justify-center">{label}</span>
      </Link>
    </header>
  )
}
