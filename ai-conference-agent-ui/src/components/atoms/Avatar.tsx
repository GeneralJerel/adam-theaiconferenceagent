type Props = { variant: 'assistant' | 'user'; label?: string }

export default function Avatar({ variant, label }: Props) {
  const text = label ?? (variant === 'assistant' ? 'AI' : 'You')
  return <div className={`avatar ${variant}`}>{text}</div>
}


