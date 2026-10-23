import TopBar from '../components/TopBar.jsx'

export default function ImpressumPage() {
  return (
    <section className="h-[100dvh] overflow-hidden bg-black">
      <TopBar />
      <div
        className="flex h-[calc(100dvh-48px)] items-center justify-center px-6 text-center"
      >
        <div className="space-y-1 text-sm text-[#808080]">
          <p className="font-body text-base font-extrabold text-accent">JP Frameworks GmbH</p>
          <p>Löwengasse 28/30, 1030 Wien</p>
          <p>
            <a className="underline underline-offset-2" href="mailto:hallo@kleinlaut.wien">
              hallo@kleinlaut.wien
            </a>
          </p>
          <p>
            <a className="underline underline-offset-2" href="tel:+4366499224120">+43 664 99224120</a>
          </p>
          <p>ATU80958368</p>
          <p>FN 617457 a</p>
          <p>Gastronomie Betrieb</p>
        </div>
      </div>
    </section>
  )
}
