import { AppShell } from '../components/system/AppShell'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { BottomNav } from '../components/BottomNav'
import { BackLink } from '../components/BackLink'
import { IconArrowUpRight } from '../components/icons'
import { track } from '../lib/analytics'

/**
 * §2.8. Deliberately plain: no imagery, no mascot, no encouragement copy.
 *
 * NEDA is intentionally absent. The current US entry is the National Alliance
 * for Eating Disorders, whose helpline is staffed by licensed clinicians.
 */

interface Helpline {
  region: string
  name: string
  phone: string
  /** Digits for the tel: link, which cannot carry spaces or dashes. */
  dial: string
  detail: string
  url: string
}

const HELPLINES: Helpline[] = [
  {
    region: 'United States',
    name: 'National Alliance for Eating Disorders',
    phone: '1-866-662-1235',
    dial: '+18666621235',
    detail: 'Licensed eating-disorder therapists, weekdays 9am–7pm ET.',
    url: 'https://www.allianceforeatingdisorders.com',
  },
  {
    region: 'England',
    name: 'Beat',
    phone: '0808 801 0677',
    dial: '+448088010677',
    detail: 'Phone and webchat, weekdays 3pm–8pm. The site lists separate lines for Scotland, Wales and Northern Ireland.',
    url: 'https://www.beateatingdisorders.org.uk/get-information-and-support/get-help-for-myself/support-now/',
  },
  {
    region: 'Canada',
    name: 'NEDIC',
    phone: '1-866-633-4220',
    dial: '+18666334220',
    detail: 'Phone, chat and email support from trained helpline staff.',
    url: 'https://nedic.ca/hey-there/',
  },
  {
    region: 'Australia',
    name: 'Butterfly Foundation',
    phone: '1800 33 4673',
    dial: '+611800334673',
    detail: 'Qualified counsellors, seven days a week, 8am–midnight Australian Eastern time.',
    url: 'https://butterfly.org.au/get-support/helpline/',
  },
  {
    region: 'Elsewhere',
    name: 'Academy for Eating Disorders',
    phone: '',
    dial: '',
    detail: 'Search its international professional directory by country.',
    url: 'https://community.aedweb.org/expert-directory',
  },
]

export function SupportPage() {
  useEffect(() => track({ name: 'support_opened' }), [])

  return (
    <AppShell screen="k-page k-support" nav={<BottomNav />}>
      <main className="app-main k-page-main" data-mascot-avoid>
        <BackLink to="/settings" />
        <header className="k-page-head">
          <p className="k-eyebrow">Someone to talk to</p>
          <h1>Support</h1>
          <p className="k-page-intro">
            If food, eating or your body is feeling heavy, talking to someone
            helps more than any tracker can. The helplines below are free and
            confidential; the directory can help you find local support.
          </p>
        </header>

        <ul className="k-support-lines">
          {HELPLINES.map(line => (
            <li className="k-card k-support-line" key={line.region}>
              <p className="k-eyebrow">{line.region}</p>
              <h2>{line.name}</h2>
              {line.dial ? (
                <a className="k-support-phone" href={`tel:${line.dial}`}>{line.phone}</a>
              ) : null}
              <p className="k-support-detail">{line.detail}</p>
              <a className="k-row-link" href={line.url} target="_blank" rel="noreferrer">
                <span>Visit website</span>
                <IconArrowUpRight size={16} />
              </a>
            </li>
          ))}
        </ul>

        <section className="k-card k-support-urgent" aria-labelledby="support-urgent-title">
          <h2 id="support-urgent-title">In immediate danger</h2>
          <p className="k-support-detail">
            Call your local emergency number. In the US you can also call or
            text 988 for the Suicide and Crisis Lifeline.
          </p>
        </section>

        <section className="k-card k-support-pause" aria-label="Take a break">
          <p className="k-support-detail">
            You can also step away from the numbers without losing your streak.
          </p>
          <Link className="k-row-link" to="/settings">
            <span>Pause tracking</span>
            <IconArrowUpRight size={16} />
          </Link>
        </section>

        <p className="k-page-foot">
          Poiem is a habit tracker, not a medical tool.
        </p>
      </main>
    </AppShell>
  )
}

export default SupportPage
