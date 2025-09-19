import PromptCard from '../molecules/PromptCard'
import ConversationStarters from '../molecules/ConversationStarters'
import { useState } from 'react'

type Props = { onGenerate?: (text: string) => void }

export default function Hero({ onGenerate }: Props) {
  const [prompt, setPrompt] = useState('')
  return (
    <section className="hero">
      <div className="hero-grid">
        <div>
          <h1 className="display">Adam, the ai conference agent</h1>
          <p className="lead">
            Ask questions about every session, panel, and speaker. We process full
            transcripts so you can catch up on what you missed and go deeper on what
            you loved.
          </p>
        </div>
        <div className="hero-inner">
          <PromptCard onGenerate={onGenerate} value={prompt} onChange={setPrompt} />
          <ConversationStarters onPick={(text) => onGenerate?.(text)} />
        </div>
      </div>
    </section>
  )
}


