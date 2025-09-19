type Props = { role: 'assistant' | 'user'; children: React.ReactNode }

export default function ChatBubble({ role, children }: Props) {
  return <div className={`bubble ${role}`}>{children}</div>
}


