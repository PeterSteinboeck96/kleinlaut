import TopBar from '../components/TopBar.jsx'
import useFixedPage from '../hooks/useFixedPage.js'
import raumplanImage from '@/assets/images/raumplan.webp'
import { copy, language } from '../i18n.js'
import '../styles/pages.css'

// SVG labels share the image's coordinate system, so they remain aligned at
// every size without editing the original artwork or covering its room outlines.
const roomLabels = [
  { index: 0, x: 624, y: 173, width: 250, size: 48 },
  { index: 5, x: 780, y: 1624, width: 320, size: 48 },
]

export default function RaumplanPage() {
  const pageRef = useFixedPage()

  return (
    <section ref={pageRef} className="site-page fixed-page floorplan-page">
      <TopBar />
      <div className="page-panel">
        {language === 'de' ? <img className="floorplan-image" src={raumplanImage} alt={copy.floorplanAlt} width="3490" height="5478" decoding="async" /> : (
          <svg className="floorplan-image" viewBox="0 0 1247 1958" role="img" aria-labelledby="floorplan-title floorplan-rooms">
            <title id="floorplan-title">{copy.floorplanAlt}</title>
            <desc id="floorplan-rooms">{copy.floorplanRooms.join(', ')}</desc>
            <image href={raumplanImage} width="1247" height="1958" />
            {roomLabels.map(({ index, x, y, width, size }) => (
              <g key={index}>
                <rect x={x - width / 2} y={y - 40} width={width} height="80" fill="#1a1a1a" />
                <text x={x} y={y} fill="#ffff00" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia, serif" fontSize={size} fontWeight="700" fontStyle="italic">{copy.floorplanRooms[index]}</text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </section>
  )
}
