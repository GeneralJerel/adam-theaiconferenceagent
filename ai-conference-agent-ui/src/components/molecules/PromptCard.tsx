import { useState } from 'react'
import TextArea from '../atoms/TextArea'
import Button from '../atoms/Button'

type Props = {
  onGenerate?: (text: string) => void
  value?: string
  onChange?: (text: string) => void
}

export default function PromptCard({ onGenerate }: Props) {
  const [internalPrompt, setInternalPrompt] = useState('')
  const prompt = (arguments[0] as Props).value ?? internalPrompt
  const setPrompt = (val: string) => {
    if ((arguments[0] as Props).onChange) {
      ;((arguments[0] as Props).onChange as (text: string) => void)(val)
    } else {
      setInternalPrompt(val)
    }
  }

  return (
    <div className="prompt-card">
      <div className="prompt-header">Describe what you’re looking for</div>
      <TextArea
        placeholder="Ask about talks, panels, or speakers from the AI conference..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onGenerate?.(prompt.trim())
          }
        }}
      />
      <div className="controls">
        <Button onClick={() => onGenerate?.(prompt.trim())}>Generate answers</Button>
      </div>
    </div>
  )
}


