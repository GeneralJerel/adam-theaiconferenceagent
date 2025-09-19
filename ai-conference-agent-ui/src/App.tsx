import './App.css'
import { useState } from 'react'
import Header from './components/organisms/Header'
import Hero from './components/organisms/Hero'
import Chat from './components/organisms/Chat'

export default function App() {
  const [view, setView] = useState<'home' | 'chat'>('home')
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null)
  return (
    <div className="app-shell">
      <div className="container">
        <Header onTryNow={() => setView('chat')} onBrandClick={() => setView('home')} />
        {view === 'home' ? (
          <Hero onGenerate={(text) => { if (text && text.trim()) { setInitialPrompt(text.trim()); setView('chat') } }} />
        ) : (
          <Chat initialPrompt={initialPrompt ?? undefined} />
        )}
      </div>
    </div>
  )
}
