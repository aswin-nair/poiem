import { AppShell } from '../components/system/AppShell'
import { BottomNav } from '../components/BottomNav'
import { BackLink } from '../components/BackLink'
import { IconArrowUpRight } from '../components/icons'
import { BrandLogo } from '../components/BrandLogo'
import { MomoSticker } from '../components/MomoSticker'
import identity from '../brand/identity.json'

export function AboutPage() {
  return (
    <AppShell screen="k-page k-about" nav={<BottomNav />}>
      <main className="app-main k-page-main" data-mascot-avoid>
        <BackLink to="/settings" />
        <header className="k-page-head">
          <p className="k-eyebrow">The small print, with feeling</p>
          <h1>About</h1>
        </header>

        <section className="k-about-hero" aria-label="Meet Poiem">
          <BrandLogo />
          <h2>A little tracking.<br />A lot of living.</h2>
          <p>Your food journal, with room for real life. Log meals by photo or text, notice your patterns, and find a rhythm that feels like you.</p>
          <span className="k-about-stamp">{identity.domain} · All foods welcome.</span>
        </section>

        <section className="k-card k-about-momo" aria-labelledby="about-momo-title">
          <span className="k-about-momo-art" aria-hidden="true"><MomoSticker mood="proud" pose="still" /></span>
          <div>
            <h2 id="about-momo-title">Same Momo. A new chapter.</h2>
            <p>Momo is Poiem’s resident dumpling: part sidekick, part tiny comedy act. Here to cheer on the little things, never to judge your plate.</p>
            <p>Previously Fud AI. Your existing journal, settings, and account stay with you.</p>
          </div>
        </section>

        <nav className="k-card k-about-links" aria-label="More about Poiem">
          <a href="https://github.com/apoorvdarshan/fud-ai" target="_blank" rel="noreferrer" className="k-row-link">
            <span>Original open-source project</span>
            <IconArrowUpRight size={16} />
          </a>
          <a href={`${import.meta.env.BASE_URL}brand/index.html`} target="_blank" rel="noreferrer" className="k-row-link">
            <span>Poiem brand kit</span>
            <IconArrowUpRight size={16} />
          </a>
        </nav>

        <p className="k-page-foot">Poiem · Your plate. Your pace.</p>
      </main>
    </AppShell>
  )
}

export default AboutPage
