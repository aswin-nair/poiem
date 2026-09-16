import { ClayInput } from '../components/ClayInput'
import { Counter } from '../components/Counter'
import { PathNode } from '../components/PathNode'
import { PressableButton } from '../components/PressableButton'
import { Surface } from '../components/Surface'
import { useState } from 'react'

/** Dev-only primitive mount. Not a production route. */
export function ComponentSheetPage() {
  const [activations, setActivations] = useState(0)
  return (
    <div className="app-shell">
      <main className="app-main motion-stagger">
        <h1 className="page-title">Primitives</h1>

        <p className="eyebrow">Clay elevations</p>
        <Surface elevation={1}><p>Resting e1</p></Surface>
        <Surface elevation={2}><p>Raised e2</p></Surface>
        <Surface elevation={3}><p>Primary e3</p></Surface>
        <Surface interactive><p>Pressable clay</p></Surface>

        <p className="eyebrow">Buttons</p>
        <PressableButton label="Primary" onClick={() => setActivations(value => value + 1)} />
        <PressableButton variant="secondary" label="Secondary" />
        <PressableButton variant="ghost" label="Ghost" />
        <PressableButton variant="destructive" label="Delete" />
        <PressableButton disabled label="Disabled action" />
        <PressableButton to="/" disabled label="Disabled link" onClick={() => setActivations(value => value + 1)} />
        <p role="status">Button activations: {activations}</p>

        <p className="eyebrow">Inset field</p>
        <ClayInput aria-label="Clay field" placeholder="Type in clay" />

        <p className="eyebrow">Counters</p>
        <div className="home-counter-row">
          <Counter label="days" value={7} tone="streak" />
          <Counter label="xp" value={120} tone="xp" />
          <Counter label="freezes" value={2} tone="freeze" />
        </div>

        <p className="eyebrow">Path nodes</p>
        <div className="meal-path-nodes">
          <PathNode slot="breakfast" status="done" />
          <PathNode slot="lunch" status="current" mascot />
          <PathNode slot="dinner" status="later" />
        </div>
      </main>
    </div>
  )
}

export default ComponentSheetPage
