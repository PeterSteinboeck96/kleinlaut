import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import drinksPdf from '@/assets/pdfs/kleinlaut.pdf'
import '../styles/pages.css'

export default function MenuPage() {
  return (
    <section className="site-page menu-page">
      <TopBar />
      <div className="page-panel">
        <nav className="menu-links font-display" aria-label="Seitennavigation">
          <a href={drinksPdf} target="_blank" rel="noreferrer">
            DRINKS
          </a>
          <Link to="/fotos">FOTOS</Link>
          <Link to="/raumplan">RAUMPLAN</Link>
          <Link to="/impressum">IMPRESSUM</Link>
        </nav>
      </div>
    </section>
  )
}
