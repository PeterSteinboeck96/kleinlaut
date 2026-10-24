import { useEffect, useId, useRef, useState } from 'react'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion.js'
import { copy, language } from '../i18n.js'
import mapImage from '@/assets/images/map_mobile.webp'

// The route is baked into the photograph. These small road-coloured covers
// follow only its dashes; removing them reveals the original image unchanged.
const dashCovers = `M2616.3 1070.7 L2596.7 1085.6
  M2566.4 1108.6 L2530.2 1136.0 M2500.0 1159.0 L2464.3 1186.3
  M2434.0 1209.4 L2398.0 1236.9 M2367.9 1259.9 L2331.7 1287.7
  M2301.7 1310.7 L2265.8 1338.4 M2236.2 1361.5 L2201.6 1390.6
  M2173.0 1416.3 L2141.9 1448.6 M2117.9 1478.0 L2090.5 1513.6
  M2061.5 1537.9 L2020.4 1556.9 M1984.4 1569.4 L1941.3 1583.5
  M1905.1 1594.6 L1861.6 1607.5 M1825.2 1617.9 L1781.5 1630.2
  M1744.6 1640.3 L1701.0 1652.0 M1664.4 1661.8 L1620.5 1673.1
  M1583.7 1682.7 L1559.9 1688.6`
const route = 'M2625 1064 L2219 1376 Q2160 1424 2104 1496 Q2081 1528 2041 1547 Q1964 1585 1552 1691'
let routeHasAppeared = false

export default function MobileMap() {
  const maskId = useId()
  const routeRef = useRef(null)
  const reduceMotion = usePrefersReducedMotion()
  const [loaded, setLoaded] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [revealed, setRevealed] = useState(() => routeHasAppeared)

  useEffect(() => {
    if (reduceMotion) {
      routeHasAppeared = true
      setRevealed(true)
      return
    }
    if (!loaded || revealed) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.65) return
      routeHasAppeared = true
      setDrawing(true)
      observer.disconnect()
    }, { threshold: 0.65, rootMargin: '0px 0px -10% 0px' })
    observer.observe(routeRef.current)
    return () => observer.disconnect()
  }, [loaded, revealed, reduceMotion])

  return (
    <a className="home-map-mobile" href={`https://www.google.com/maps?q=kleinlaut&hl=${language}`}
      target="_blank" rel="noreferrer">
      <img src={mapImage} alt={copy.mapAlt} width="2965" height="3950"
        loading="lazy" decoding="async" onLoad={async event => {
          // Start after the lazy image is decoded, not merely downloaded.
          await event.currentTarget.decode().catch(() => {})
          setLoaded(true)
        }} />
      {!revealed && !reduceMotion && <svg ref={routeRef}
        className={`home-map-route${drawing ? ' is-drawing' : ''}`}
        viewBox="1530 1030 1120 710" aria-hidden="true" focusable="false"
        onAnimationEnd={() => setRevealed(true)}>
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="1530" y="1030" width="1120" height="710"
            style={{ maskType: 'luminance' }}>
            <rect x="1530" y="1030" width="1120" height="710" fill="white" />
            <path className="home-map-route-reveal" d={route} pathLength="1"
              fill="none" stroke="black" strokeWidth="64" strokeLinecap="round" />
          </mask>
        </defs>
        <path d={dashCovers} fill="none" stroke="#1f1f1f" strokeWidth="38"
          strokeLinecap="round" mask={`url(#${maskId})`} />
      </svg>}
    </a>
  )
}
