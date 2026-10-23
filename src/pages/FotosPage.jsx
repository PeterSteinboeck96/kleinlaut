import TopBar from '../components/TopBar.jsx'
import '../styles/pages.css'

const galleryImages = Object.entries(
  import.meta.glob('../assets/images/gallery/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp}', {
    eager: true,
    import: 'default',
  }),
)
  .sort(([first], [second]) => {
    const numberFromPath = (value) => {
      const match = value.match(/(\d+)(?=\.[^.]+$)/)
      return match ? Number(match[1]) : Number.POSITIVE_INFINITY
    }

    const firstNumber = numberFromPath(first)
    const secondNumber = numberFromPath(second)
    return firstNumber !== secondNumber ? firstNumber - secondNumber : first.localeCompare(second)
  })
  .map(([, src]) => src)

export default function FotosPage() {
  return (
    <section className="site-page gallery-page">
      <TopBar />
      <div className="gallery-caption sm:hidden">
        <span>
          Die bunte <br />Bar im Herzen<br />Wiens &lt;3
        </span>
      </div>
      <div className="gallery-content">
        <div className="gallery-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {galleryImages.map((src, index) => (
            <img
              key={src}
              className="gallery-photo"
              src={src}
              alt={`Gallery image ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
