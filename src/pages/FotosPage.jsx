import { useSyncExternalStore } from 'react'
import TopBar from '../components/TopBar.jsx'
import useMobileScreenHeight from '../hooks/useMobileScreenHeight.js'
import { copy } from '../i18n.js'
import '../styles/pages.css'

const mobileLayout = window.matchMedia('(max-width: 1023px)')
const isMobileLayout = () => mobileLayout.matches
function subscribeToLayout(onChange) {
  mobileLayout.addEventListener('change', onChange)
  return () => mobileLayout.removeEventListener('change', onChange)
}

function numberFromPath(value) {
  const match = value.match(/(\d+)(?=\.[^.]+$)/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

const galleryImages = Object.entries(
  import.meta.glob('../assets/images/gallery/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp}', {
    eager: true,
    import: 'default',
  }),
)
  .sort(([first], [second]) => {
    const firstNumber = numberFromPath(first)
    const secondNumber = numberFromPath(second)
    return firstNumber !== secondNumber ? firstNumber - secondNumber : first.localeCompare(second)
  })
  .map(([, src], index) => ({ src, number: index + 1 }))

const mobileImages = [...galleryImages.slice(0, 2), ...galleryImages.slice(3), galleryImages[2]]

export default function FotosPage() {
  const galleryRef = useMobileScreenHeight()
  const mobile = useSyncExternalStore(subscribeToLayout, isMobileLayout)
  const photos = mobile ? mobileImages : galleryImages

  return (
    <section className="site-page gallery-page">
      <TopBar />
      {copy.galleryCaption && <div className="gallery-caption">
        <span>{copy.galleryCaption.map(line => <span className="block" key={line}>{line}</span>)}</span>
      </div>}
      <div className="gallery-content" ref={galleryRef}>
        <div className="gallery-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {photos.map(({ src, number }, index) => (
            <img
              key={src}
              className="gallery-photo"
              src={src}
              alt={`${copy.galleryAlt} ${number}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              decoding="async"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
