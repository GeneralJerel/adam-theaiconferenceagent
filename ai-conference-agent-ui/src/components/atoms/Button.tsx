import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
}

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base = variant === 'primary' ? 'primary' : 'cta'
  return <button className={`${base} ${className}`} {...props} />
}


