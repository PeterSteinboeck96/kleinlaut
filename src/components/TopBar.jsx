import { Link, useLocation } from 'react-router-dom'

export default function TopBar({ label = 'MENU' }) {
  const { pathname } = useLocation()
  const menuTarget = pathname === '/menu' ? '/' : '/menu'

  return (
    <header className="top-bar">
      <Link to={menuTarget} aria-label={label} className="top-bar__link font-display text-base">
        <span className="inline-flex items-center justify-center">{label}</span>
      </Link>
    </header>
  )
}
