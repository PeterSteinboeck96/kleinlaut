import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import SiteRoutes from './router.jsx'

export default function App() {
  const location = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location])

  return (
    <main className="text-white">
      <SiteRoutes />
    </main>
  )
}
