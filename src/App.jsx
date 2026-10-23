import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import SiteRoutes from './router.jsx'
import MenuTransition from './components/MenuTransition.jsx'

export default function App() {
  const location = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location])

  return (
    <main>
      <MenuTransition>
        <SiteRoutes />
      </MenuTransition>
    </main>
  )
}
