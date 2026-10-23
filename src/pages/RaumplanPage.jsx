import TopBar from '../components/TopBar.jsx'
import raumplanImage from '@/assets/images/raumplan.webp'
import '../styles/pages.css'

export default function RaumplanPage() {
  return (
    <section className="site-page floorplan-page">
      <TopBar />
      <div className="page-panel">
        <img className="floorplan-image" src={raumplanImage} alt="Raumplan" width="3490" height="5478" decoding="async" />
      </div>
    </section>
  )
}
