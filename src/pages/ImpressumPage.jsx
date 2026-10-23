import TopBar from '../components/TopBar.jsx'
import { copy } from '../i18n.js'
import '../styles/pages.css'

export default function ImpressumPage() {
  return (
    <section className="site-page imprint-page">
      <TopBar />
      <div className="page-panel">
        <div className="imprint-details">
          <p className="imprint-company">JP Frameworks GmbH</p>
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
          <p>{copy.business}</p>
        </div>
      </div>
    </section>
  )
}
