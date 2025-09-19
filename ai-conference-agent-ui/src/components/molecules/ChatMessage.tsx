import Avatar from '../atoms/Avatar'
import ChatBubble from '../atoms/ChatBubble'
import ReactMarkdown from 'react-markdown'

type Props = {
  role: 'assistant' | 'user'
  content: string
}

export default function ChatMessage({ role, content }: Props) {
  return (
    <div className={`message-row ${role}`}>
      <Avatar variant={role} />
      <div className="message">
        <div className="sender">{role === 'assistant' ? 'Adam' : 'You'}</div>
        <ChatBubble role={role}>
          <div className="md">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </ChatBubble>
      </div>
    </div>
  )
}


