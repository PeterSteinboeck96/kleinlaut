import TopBar from '../components/TopBar.jsx'

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
    <section className="min-h-screen bg-black pt-12">
      <TopBar />
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center sm:hidden">
        <span className="text-[0.9rem] font-extrabold italic text-accent text-center">
          Die bunte <br />Bar im Herzen<br />Wiens &lt;3
        </span>
      </div>
      <div className="min-h-[calc(100vh-48px)] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_rgba(0,0,0,0.96)_65%)] px-0 py-0">
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {galleryImages.map((src, index) => (
            <img
              key={src}
              className="block h-screen w-full object-cover shadow-none sm:h-auto sm:shadow-soft-glow"
              src={src}
              alt={`Gallery image ${index + 1}`}
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
