'use client'

import { useState, useRef, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/common'
import { Send, Bot, Dumbbell, Target, TrendingUp, Calendar } from 'lucide-react'
import { useUser } from '@/lib/contexts/UserContext'
import supabase from '@/lib/hooks/useSupabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  { icon: Target, text: 'Jag vill nå 100 kg i Bench Press' },
  { icon: TrendingUp, text: 'Analysera min träningsutveckling' },
  { icon: Calendar, text: 'Skapa ett veckoschema för mig' },
  { icon: Dumbbell, text: 'Hur mår min återhämtning?' },
]

export default function AICoachPage() {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hej! Jag är din personliga AI-tränare. Jag har tillgång till all din träningshistorik, hälsodata och personliga rekord. Berätta vad du vill uppnå — jag skapar ett program baserat på just din data.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const profileId = user?.id || null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          profileId: profileId || user?.id,
          conversationId: 'main',
        }),
      })

      const data = await response.json()
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || data.error || 'Kunde inte svara just nu.',
          timestamp: new Date(),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Anslutningsfel. Försök igen.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="flex flex-col" style={{ height: 'calc(100dvh - 130px)' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                  <Bot size={16} />
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
                <div className="flex gap-1 items-center">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.15s' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                onClick={() => sendMessage(text)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Icon size={14} className="text-blue-500 shrink-0" />
                {text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/5 bg-zinc-950 px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Fråga din tränare..."
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              disabled={loading}
            />
            <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="rounded-xl px-4">
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
