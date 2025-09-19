import { useEffect, useRef, useState } from 'react'
import ChatMessage from '../molecules/ChatMessage'
import ChatComposer from '../molecules/ChatComposer'

export type ChatItem = { id: string; role: 'assistant' | 'user'; content: string }

const initialMessages: ChatItem[] = [
  { id: 'u1', role: 'user', content: 'What are the top 3 things from the event?' },
  {
    id: 'a1',
    role: 'assistant',
    content:
      'Here are the big takeaways:\n1) Inference is everything — the stack and cost structure are shifting toward fast, affordable inference.\n2) National security is a central driver — policy, funding, and talent are aligning around secure AI.\n3) Reliability matters — teams emphasized evals, monitoring, and safe deployment as the path to real adoption.',
  },
]

type Props = { initialPrompt?: string }

export default function Chat({ initialPrompt }: Props) {
  const [messages, setMessages] = useState<ChatItem[]>(() => (initialPrompt ? [] : initialMessages))
  const scroller = useRef<HTMLDivElement>(null)
  const hasAutoSent = useRef(false)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    if (initialPrompt && !hasAutoSent.current) {
      hasAutoSent.current = true
      handleSend(initialPrompt)
    }
  }, [initialPrompt])

  const handleSend = async (text: string) => {
    const userItem: ChatItem = { id: crypto.randomUUID(), role: 'user', content: text }
    let reply =
      'From the conference transcripts: inference speed and cost dominated, national security shaped priorities, and reliability practices (evals, red-teaming, and observability) were repeatedly cited as critical.'

    try {
      const res = await fetch('/conversation-mockdata.json')
      if (res.ok) {
        const data = (await res.json()) as Record<string, string>
        if (data[text]) reply = data[text]
      }
    } catch {}

    const assistantItem: ChatItem = { id: crypto.randomUUID(), role: 'assistant', content: reply }
    setMessages((prev) => [...prev, userItem, assistantItem])
  }

  return (
    <section className="chat">
      <div className="messages" ref={scroller}>
        {messages.map((m) => (
          <ChatMessage key={m.id} role={m.role} content={m.content} />
        ))}
      </div>
      <ChatComposer onSend={handleSend} />
    </section>
  )
}


