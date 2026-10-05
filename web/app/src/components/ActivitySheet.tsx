import { useState, useEffect, useRef } from 'react'
import { useApp } from '../store/AppContext'
import { ACTIVITY_PRESETS, DURATION_OPTIONS, estimateKcal, type ActivityPreset } from '../lib/activities'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { useFeel } from '../hooks/useHaptic'

interface ActivitySheetProps {
  defaultPreset?: ActivityPreset
  onClose: () => void
  onLogged?: (kcal: number, name: string) => void
}

export function ActivitySheet({ defaultPreset, onClose, onLogged }: ActivitySheetProps) {
  const { state, addExercise } = useApp()
  const feel = useFeel()
  const weightKg = state.profile.weightKg ?? 70

  const [selected, setSelected] = useState<ActivityPreset>(defaultPreset ?? ACTIVITY_PRESETS[0])
  const [durationMins, setDurationMins] = useState(30)
  const [kcalOverride, setKcalOverride] = useState<string>('')
  const [saved, setSaved] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)
  useDialogFocus(backdropRef, onClose)

  const estimatedKcal = estimateKcal(selected.met, weightKg, durationMins)
  const finalKcal = kcalOverride !== '' ? Math.max(1, parseInt(kcalOverride) || 1) : estimatedKcal

  // Sync override field when preset/duration changes (unless user typed something)
  useEffect(() => {
    setKcalOverride('')
  }, [selected, durationMins])

  function handleLog() {
    if (saved) return
    setSaved(true)
    feel('log-confirm')
    const entry = {
      id: crypto.randomUUID(),
      name: selected.name,
      emoji: selected.emoji,
      caloriesBurned: finalKcal,
      durationMinutes: durationMins,
      timestamp: new Date().toISOString(),
    }
    addExercise(entry)
    onLogged?.(finalKcal, selected.name)
    setTimeout(onClose, 220)
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div
      className="activity-sheet-backdrop"
      ref={backdropRef}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal
      aria-label="Log activity"
    >
      <div className="activity-sheet">
        {/* Drag handle */}
        <div className="activity-sheet-handle" aria-hidden />

        <div className="activity-sheet-title">Log Activity</div>

        {/* Activity presets */}
        <div className="activity-preset-grid">
          {ACTIVITY_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              className={`activity-preset-chip${selected.id === preset.id ? ' active' : ''}`}
              onClick={() => { if (selected.id !== preset.id) { setSelected(preset); feel('select') } }}
            >
              <span className="activity-preset-emoji">{preset.emoji}</span>
              <span className="activity-preset-name">{preset.name}</span>
            </button>
          ))}
        </div>

        {/* Duration stepper */}
        <div className="activity-duration-row">
          <span className="activity-duration-label">Duration</span>
          <div className="activity-duration-chips">
            {DURATION_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                className={`activity-dur-chip${durationMins === d ? ' active' : ''}`}
                onClick={() => { if (durationMins !== d) { setDurationMins(d); feel('select') } }}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        {/* Live kcal display + optional override */}
        <div className="activity-kcal-row">
          <div className="activity-kcal-display">
            <span className="activity-kcal-num">{finalKcal}</span>
            <span className="activity-kcal-unit">kcal burned</span>
          </div>
          <div className="activity-kcal-override-wrap">
            <input
              type="number"
              className="activity-kcal-override"
              value={kcalOverride}
              onChange={e => setKcalOverride(e.target.value)}
              placeholder={String(estimatedKcal)}
              min={1}
              aria-label="Override calories burned"
            />
            <span className="activity-kcal-override-label">override</span>
          </div>
        </div>

        <button
          type="button"
          className={`activity-log-btn${saved ? ' saved' : ''}`}
          onClick={handleLog}
          disabled={saved}
        >
          {saved ? `${selected.emoji} Logged!` : `Log ${selected.emoji} ${selected.name}`}
        </button>
      </div>
    </div>
  )
}
