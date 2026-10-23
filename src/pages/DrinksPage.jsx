import { useLayoutEffect, useRef } from 'react'
import TopBar from '../components/TopBar.jsx'
import heroImage from '@/assets/images/hero.webp'
import heroDesktopImage from '@/assets/images/hero_desktop.webp'
import logoImage from '@/assets/images/logo.png'
import mapMobileImage from '@/assets/images/map_mobile.webp'
import '../styles/home.css'

const mapSrc =
  'https://www.google.com/maps?q=kleinlaut&z=18&output=embed'

export default function DrinksPage() {
  const contactRef = useRef(null)

  useLayoutEffect(() => {
    const contact = contactRef.current
    const header = contact.closest('.site-page').querySelector('.top-bar')
    let animationFrame = 0

    function updateVisibility() {
      animationFrame = 0
      // Hide the entire paragraph before the fixed header clips its first line.
      // Visibility preserves its layout so scrolling cannot make the page jump.
      contact.toggleAttribute('data-obscured', contact.getBoundingClientRect().top < header.getBoundingClientRect().bottom + 16)
    }

    function scheduleUpdate() {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateVisibility)
    }

    const observer = new ResizeObserver(scheduleUpdate)
    observer.observe(header)
    observer.observe(contact)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('pageshow', scheduleUpdate)
    window.visualViewport?.addEventListener('resize', scheduleUpdate)
    updateVisibility()

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('pageshow', scheduleUpdate)
      window.visualViewport?.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

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
              className="home-logo animate-fade-rise drop-shadow-lg"
              src={logoImage}
              alt="Kleinlaut"
              width="1608"
              height="325"
            />
            <p
              className="home-hours font-body font-bold text-accent animate-fade-rise"
            >
              Dienstag bis Samstag<br />18:00 - 02:00
            </p>
          </div>
          <p
            ref={contactRef}
            className="home-contact text-accent animate-fade-in"
          >
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
