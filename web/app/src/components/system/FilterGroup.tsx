export function FilterGroup({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  options: ReadonlyArray<{ id: string; label: string }>
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  return (
    <div className="k-filter-group" role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          className="k-filter"
          aria-pressed={option.id === value}
          disabled={disabled}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
