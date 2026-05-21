import React, { useState, useEffect, useRef } from 'react'
import { Send, Users, Sparkles } from 'lucide-react'
import type { ChatMessage, ClientMessage } from '../hooks/useGameSocket'

import { cn } from '../lib/utils'

interface ChatPanelProps {
  gameId: string
  chatMessages: ChatMessage[]
  sendMessage: (message: ClientMessage) => void
  spectatorCount: number
  className?: string
  borderless?: boolean
}

export function ChatPanel({
  gameId,
  chatMessages,
  sendMessage,
  spectatorCount,
  className,
  borderless,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('')
  const [username] = useState(() => {
    const key = 'chess_llm_guest_username'
    let stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    if (!stored) {
      const chessTitles = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King']
      const randomTitle = chessTitles[Math.floor(Math.random() * chessTitles.length)]
      const randomNumber = Math.floor(1000 + Math.random() * 9000)
      stored = `Guest ${randomTitle} #${randomNumber}`
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, stored)
      }
    }
    return stored
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to the bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    sendMessage({
      type: 'CHAT',
      gameId,
      username,
      message: inputText.trim(),
    })
    setInputText('')
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full animate-in fade-in duration-300',
        borderless
          ? 'bg-transparent border-0 rounded-none shadow-none'
          : 'bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl',
        className,
      )}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black tracking-widest text-neutral-300 uppercase">Live Chat</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-400">
          <Users size={12} className="text-neutral-500" />
          <span>{spectatorCount} watching</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
            <span className="text-[10px] font-black tracking-widest text-neutral-600 uppercase">Lobby Silence</span>
            <p className="text-xs text-neutral-500 max-w-[200px]">
              No spectator chatter yet. Send a message to start the conversation!
            </p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            const isCommentator = msg.username.includes('Commentator')
            return (
              <div
                key={idx}
                className={`flex flex-col gap-1 transition-all duration-300 ${
                  isCommentator ? 'items-start animate-in slide-in-from-left-2' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      isCommentator ? 'text-amber-400' : 'text-neutral-400'
                    }`}
                  >
                    {msg.username}
                  </span>
                  {isCommentator ? (
                    <span className="flex items-center gap-0.5 px-1 py-0.25 text-[8px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-sm uppercase tracking-widest">
                      <Sparkles size={8} /> Host
                    </span>
                  ) : (
                    <span className="px-1 py-0.25 text-[8px] font-extrabold bg-neutral-800 text-neutral-500 rounded-sm uppercase tracking-wider">
                      Guest
                    </span>
                  )}
                  <span className="text-[8px] text-neutral-600 font-medium">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`text-xs px-3 py-2 rounded-lg leading-relaxed max-w-[90%] shadow-sm ${
                    isCommentator
                      ? 'bg-amber-500/5 border border-amber-500/15 text-amber-100 italic rounded-tl-none font-medium'
                      : 'bg-neutral-800/60 border border-neutral-800/40 text-neutral-200 rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <form onSubmit={handleSend} className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Chat with spectators..."
          className="flex-1 min-w-0 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500 text-neutral-950 font-bold hover:bg-amber-400 disabled:bg-neutral-900 disabled:text-neutral-700 transition-colors cursor-pointer"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
