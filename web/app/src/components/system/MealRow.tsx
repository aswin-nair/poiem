import type { ReactNode } from 'react'

export function MealRow({
  name,
  meta,
  kcal,
  tile,
  fresh = false,
  onClick,
}: {
  name: string
  meta: ReactNode
  kcal: ReactNode
  tile: ReactNode
  fresh?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={`k-meal-row${fresh ? ' is-fresh' : ''}`} onClick={onClick}>
      {tile}
      <span className="k-meal-name">
        {name}
        <small>{meta}</small>
      </span>
      <span className="k-meal-kcal tabular">{kcal}</span>
    </button>
  )
}
