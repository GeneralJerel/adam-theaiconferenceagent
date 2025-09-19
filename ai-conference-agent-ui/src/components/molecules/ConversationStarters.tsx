import Button from '../atoms/Button'

type Props = { onPick?: (text: string) => void }

export default function ConversationStarters({ onPick }: Props) {
  const starters = [
    'what are the top 3 ideas from the event',
    'what did people say about inference?',
    'what did the speakers say about fine tuning?',
  ]

  return (
    <div className="starters">
      {starters.map((s) => (
        <Button key={s} variant="ghost" onClick={() => onPick?.(s)}>
          {s}
        </Button>
      ))}
    </div>
  )
}



