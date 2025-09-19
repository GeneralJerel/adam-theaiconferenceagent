import { useState } from 'react'
import Button from '../atoms/Button'

type Props = { onSend: (text: string) => void }

export default function ChatComposer({ onSend }: Props) {
  const [text, setText] = useState('')
  const submit = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }
  return (
    <div className="composer">
      <input
        placeholder="Ask about the conference..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <Button onClick={submit}>Send</Button>
    </div>
  )
}


