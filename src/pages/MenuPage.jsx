import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import drinksPdf from '@/assets/pdfs/kleinlaut.pdf'

export default function MenuPage() {
  return (
    <section className="h-[100dvh] overflow-hidden bg-black">
      <TopBar label="ZURÜCK" />
      <div className="flex h-[calc(100dvh-48px)] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_rgba(0,0,0,0.96)_65%)]">
        <nav className="space-y-5 text-center font-display text-5xl tracking-normal">
          <a className="block transition-colors text-accent hover:text-white" href={drinksPdf} target="_blank" rel="noreferrer">
            DRINKS
          </a>
          <Link className="block transition-colors text-accent hover:text-white" to="/fotos">FOTOS</Link>
          <Link className="block transition-colors text-accent hover:text-white" to="/raumplan">RAUMPLAN</Link>
          <Link className="block transition-colors text-accent hover:text-white" to="/impressum">IMPRESSUM</Link>
        </nav>
      </div>
    </section>
  )
}
