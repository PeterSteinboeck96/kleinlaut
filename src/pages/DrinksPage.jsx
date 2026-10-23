import TopBar from '../components/TopBar.jsx'
import { useMenuTransition } from '../components/MenuTransition.jsx'
import heroImage from '@/assets/images/hero.webp'
import heroDesktopImage from '@/assets/images/hero_desktop.webp'
import logoImage from '@/assets/images/logo.png'
import mapMobileImage from '@/assets/images/map_mobile.webp'
import '../styles/home.css'

const mapSrc =
  'https://www.google.com/maps?q=kleinlaut&z=18&output=embed'

export default function DrinksPage() {
  const { isRevealing } = useMenuTransition()
  const entrance = isRevealing ? 'opacity-0' : 'animate-fade-rise'

  return (
    <section className="site-page home-page">
      <TopBar />
      <div className="home-hero">
        <picture className="home-hero-background">
          <source srcSet={heroDesktopImage} media="(min-width: 1024px), (orientation: landscape)" />
          <img
            src={heroImage}
            alt="Cocktail in a dimly lit bar"
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
              Dienstag bis Samstag<br />18:00 - 02:00
            </p>
          </div>
          <p className="home-contact text-accent">
            Bei Fragen melde dich gerne per{' '}
            <a className="underline underline-offset-2" href="tel:+4366499224120">Anruf</a>,
            slide in unsere{' '}
            <a
              className="underline underline-offset-2"
              href="https://www.instagram.com/kleinlaut1070/"
              target="_blank"
              rel="noreferrer"
            >
              DMs
            </a>
            {' '}oder schreibe uns eine{' '}
            <a className="underline underline-offset-2" href="mailto:hallo@kleinlaut.wien">Mail</a> :)
          </p>
        </div>
      </div>
      <div className="home-map">
        <a
          className="home-map-mobile"
          href="https://www.google.com/maps?q=kleinlaut"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={mapMobileImage}
            alt="Kleinlaut on Google Maps"
            width="2965"
            height="3950"
            loading="lazy"
            decoding="async"
          />
        </a>
        <div className="home-map-desktop">
          <iframe
            src={mapSrc}
            className="h-full w-full border-0 filter grayscale invert hue-rotate-180 contrast-90"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            title="Kleinlaut location on Google Maps"
          ></iframe>
        </div>
      </div>
    </section>
  )
}
