import TopBar from '../components/TopBar.jsx'
import MobileMap from '../components/MobileMap.jsx'
import { useMenuTransition } from '../components/MenuTransition.jsx'
import useMobileScreenHeight from '../hooks/useMobileScreenHeight.js'
import { copy, language } from '../i18n.js'
import heroImage from '@/assets/images/hero.webp'
import heroDesktopImage from '@/assets/images/hero_desktop.webp'
import logoImage from '@/assets/images/logo.png'
import '../styles/home.css'

const mapSrc =
  `https://www.google.com/maps?q=kleinlaut&z=18&output=embed&hl=${language}`

export default function DrinksPage() {
  const heroRef = useMobileScreenHeight()
  const { isRevealing } = useMenuTransition()
  const entrance = isRevealing ? 'opacity-0' : 'animate-fade-rise'

  return (
    <section className="site-page home-page">
      <TopBar />
      <div className="home-hero" ref={heroRef}>
        <picture className="home-hero-background">
          <source srcSet={heroDesktopImage} media="(min-width: 1024px), (orientation: landscape)" />
          <img
            src={heroImage}
            alt={copy.heroAlt}
            width="1232"
            height="2667"
            fetchPriority="high"
          />
        </picture>
        <div className="home-hero-content">
          <div className="home-brand">
            <img
              className={`home-logo drop-shadow-lg ${entrance}`}
              src={logoImage}
              alt="Kleinlaut"
              width="1608"
              height="325"
            />
            <p
              className={`home-hours font-body font-bold text-accent ${entrance}`}
            >
              {copy.days}<br />{copy.hours}
            </p>
          </div>
          <p className="home-contact text-accent">
            {copy.contact.beforeCall}
            <a className="underline underline-offset-2" href="tel:+4366499224120">{copy.contact.call}</a>
            {copy.contact.beforeInstagram}
            <a
              className="underline underline-offset-2"
              href="https://www.instagram.com/kleinlaut1070/"
              target="_blank"
              rel="noreferrer"
            >
              {copy.contact.instagram}
            </a>
            {copy.contact.beforeEmail}
            <a className="underline underline-offset-2" href="mailto:hallo@kleinlaut.wien">{copy.contact.email}</a>
            {copy.contact.afterEmail}
          </p>
        </div>
      </div>
      <div className="home-map">
        <MobileMap />
        <div className="home-map-embed home-map-desktop">
          <iframe
            src={mapSrc}
            className="h-full w-full border-0 filter grayscale invert hue-rotate-180 contrast-90"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            title={copy.mapTitle}
          />
        </div>
      </div>
    </section>
  )
}
