import type { TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

export default function TextArea({ className = '', ...props }: Props) {
  return <textarea className={`textarea ${className}`} {...props} />
}


