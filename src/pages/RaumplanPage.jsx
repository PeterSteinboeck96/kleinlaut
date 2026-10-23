import TopBar from '../components/TopBar.jsx'
import raumplanImage from '@/assets/images/raumplan.webp'

export default function RaumplanPage() {
  return (
    <section className="h-[100vh] overflow-hidden bg-black">
      <TopBar />
      <div className="flex h-full flex-col items-center pt-12">
        <div className="w-full max-w-[320px] md:max-w-md">
          <img className="h-auto w-full" src={raumplanImage} alt="Raumplan" />
        </div>
      </div>
    </section>
  )
}
