import { Navigate, Route, Routes } from 'react-router-dom'
import DrinksPage from './pages/DrinksPage.jsx'
import MenuPage from './pages/MenuPage.jsx'
import FotosPage from './pages/FotosPage.jsx'
import RaumplanPage from './pages/RaumplanPage.jsx'
import ImpressumPage from './pages/ImpressumPage.jsx'

export default function SiteRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DrinksPage />} />
      <Route path="/drinks" element={<Navigate to="/" replace />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/fotos" element={<FotosPage />} />
      <Route path="/raumplan" element={<RaumplanPage />} />
      <Route path="/impressum" element={<ImpressumPage />} />
    </Routes>
  )
}
