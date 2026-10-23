import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import SiteRoutes from './router.jsx'

export default function App() {
  const location = useLocation()

  useLayoutEffect(() => {
    const allowScroll = location.pathname === '/fotos' || location.pathname === '/'
    document.body.classList.toggle('allow-scroll', allowScroll)
    document.documentElement.classList.toggle('allow-scroll', allowScroll)
    window.scrollTo(0, 0)

    return () => {
      document.body.classList.remove('allow-scroll')
      document.documentElement.classList.remove('allow-scroll')
    }
  }, [location])

  return (
    <div className="min-h-screen text-white">
      <SiteRoutes />
    </div>
  )
}
