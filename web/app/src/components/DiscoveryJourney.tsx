import { MOMO_ADVENTURES, type AdventureCollection, type MomoAdventure } from '../lib/momoAdventures'

const PLACES = ['Color market', 'Crunch crossing', 'Cozy cottage', 'Aroma garden', 'Kitchen stage', 'Quiet lookout']

export function DiscoveryJourney({ collection, showMomo, onVisit }: {
  collection: AdventureCollection
  showMomo: boolean
  onVisit: (adventure: MomoAdventure) => void
}) {
  const finished = MOMO_ADVENTURES.filter(item => collection.choices[item.id])
  const next = MOMO_ADVENTURES.find(item => !collection.choices[item.id])
  return <section className="k-discovery-journey" aria-label="The little joy trail">
    <div className="k-journey-ticket">
      <span>Your pocket-sized expedition</span>
      <h4>The little joy trail</h4>
      <p>From the color market to the quiet lookout. Six stops, six small discoveries, one postcard that feels like you.</p>
      <p>{showMomo ? 'Momo packed snacks. And a map. Mostly snacks.' : 'Take a detour, revisit a stop, or pick up where you left off.'}</p>
      <strong>{finished.length} of 6 stops explored</strong>
      <progress value={finished.length} max={6} aria-label="Journey progress" />
      {next && <button type="button" data-action-play="off" onClick={() => onVisit(next)}>
        {finished.length ? 'Continue the trail' : 'Start my journey'} →
      </button>}
    </div>
    <ol className="k-journey-route" aria-label="Journey stops">
      {MOMO_ADVENTURES.map((item, index) => {
        const done = Boolean(collection.choices[item.id])
        return <li key={item.id} className={done ? 'is-explored' : ''}>
          <span className="k-journey-marker" aria-hidden="true">{done ? '✓' : index + 1}</span>
          <button type="button" data-action-play="off" aria-current={next?.id === item.id ? 'step' : undefined}
            onClick={() => onVisit(item)}>
            <strong>{PLACES[index]}</strong>
            <span>{done ? 'Explored · revisit your discovery' : next?.id === item.id ? 'Your next stop' : 'Take a detour here'}</span>
          </button>
        </li>
      })}
    </ol>
    {!next ? <article className="k-journey-postcard" aria-label="Your journey postcard">
      <span>POSTCARD · LITTLE JOY TRAIL</span>
      <h4>Wish you were here? You were.</h4>
      <p>Six little moments, collected your way.</p>
      <ul>{MOMO_ADVENTURES.map(item => <li key={item.id}><strong>{item.sticker}</strong><span>{item.options.find(option => option.id === collection.choices[item.id])?.label}</span></li>)}</ul>
      <p>{showMomo ? '“An excellent expedition. My feet are tiny, but my reviews are enormous.” — Momo' : 'A small reminder of what caught your attention along the way.'}</p>
    </article> : <p>Your postcard comes together after all six stops. Previous discoveries already count. Explore in any order, at your own pace.</p>}
  </section>
}
