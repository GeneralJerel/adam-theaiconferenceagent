import type { ReactNode } from 'react'

type Option = { key: string; label: ReactNode }
type Props = {
  options: Option[]
  value: string
  onChange: (key: string) => void
}

export default function Segmented({ options, value, onChange }: Props) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button key={opt.key} className={value === opt.key ? 'active' : ''} onClick={() => onChange(opt.key)}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}


