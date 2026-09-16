import { BottomNav } from '../components/BottomNav'
import { BackLink } from '../components/BackLink'
import { IconArrowUpRight } from '../components/icons'
import { BrandLogo } from '../components/BrandLogo'
import identity from '../brand/identity.json'

export function AboutPage() {
  return (
    <div className="app-shell food-club-app">
      <main className="app-main motion-stagger">
        <BackLink to="/settings" />
        <h1 className="screen-title" style={{ marginTop: 12 }}>About</h1>

        <section className="poiem-about-hero" aria-label="Meet Poiem">
          <BrandLogo />
          <h2>A little tracking.<br />A lot of living.</h2>
          <p>Your food journal, with room for real life. Log meals by photo or text, notice your patterns, and find a rhythm that feels like you.</p>
          <span className="poiem-about-label">{identity.domain} · All foods welcome.</span>
        </section>

        <section className="progress-card">
          <h2 className="section-title">Same Momo. A new chapter.</h2>
          <p className="about-lead">Momo is Poiem’s resident dumpling: part sidekick, part tiny comedy act. Here to cheer on the little things, never to judge your plate.</p>
          <p className="about-lead">Previously Fud AI. Your existing journal, settings, and account stay with you.</p>
        </section>

        <div className="progress-card">
          <a href="https://github.com/apoorvdarshan/fud-ai" target="_blank" rel="noreferrer" className="about-link-row">
            <span>Original open-source project</span>
            <span className="about-chevron"><IconArrowUpRight size={15} /></span>
          </a>
          <a href={`${import.meta.env.BASE_URL}brand/index.html`} target="_blank" rel="noreferrer" className="about-link-row">
            <span>Poiem brand kit</span>
            <span className="about-chevron"><IconArrowUpRight size={15} /></span>
          </a>
        </div>

        <p className="about-version">Poiem · Your plate. Your pace.</p>
      </main>
      <BottomNav />
    </div>
  )
}

export default AboutPage
