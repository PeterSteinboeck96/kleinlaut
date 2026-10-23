import TopBar from '../components/TopBar.jsx'
import heroImage from '@/assets/images/hero.webp'
import heroDesktopImage from '@/assets/images/hero_desktop.webp'
import logoImage from '@/assets/images/logo.png'
import mapMobileImage from '@/assets/images/map_mobile.webp'

const mapSrc =
  'https://www.google.com/maps?q=kleinlaut&z=18&output=embed'

export default function DrinksPage() {
  return (
    <section className="relative bg-black pt-12">
      <TopBar />
      <div className="relative h-[100vh] overflow-hidden">
        <picture>
          <source srcSet={heroDesktopImage} media="(min-width: 1024px)" />
          <img
            className="absolute inset-0 h-[100vh] w-full object-cover"
            src={heroImage}
            alt="Cocktail in a dimly lit bar"
          />
        </picture>
        <div className="relative z-10 grid h-full grid-rows-[1fr_auto] px-6 text-center pb-24 sm:pb-12">
          <div className="flex flex-col items-center justify-center">
            <img
              className="w-48 max-w-[70%] animate-fade-rise drop-shadow-lg sm:w-72"
              src={logoImage}
              alt="Kleinlaut"
            />
            <p
              className="mt-4 font-body font-medium text-[0.9rem] leading-snug text-accent animate-fade-rise sm:mt-2 sm:text-lg"
            >
              Dienstag bis Samstag<br />18:00 - 02:00
            </p>
          </div>
          <p
            className="mb-24 max-w-md self-center text-center text-[0.9rem] leading-snug text-accent animate-fade-in sm:mb-10 sm:text-lg mx-auto"
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
      <div className="bg-black">
        <div className="mx-auto w-full">
          <a
            className="block sm:hidden"
            href="https://www.google.com/maps?q=kleinlaut"
            target="_blank"
            rel="noreferrer"
          >
            <img src={mapMobileImage} alt="Kleinlaut on Google Maps" className="h-auto w-full" />
          </a>
          <div className="hidden sm:block">
            <div className="overflow-hidden aspect-[20/6]">
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
        </div>
      </div>
    </section>
  )
}
