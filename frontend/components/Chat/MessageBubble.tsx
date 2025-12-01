"use client"
import React from 'react'

type Props = {
  sender: 'user' | 'bot'
  text: string
}

export default function MessageBubble({ sender, text }: Props) {
  const isUser = sender === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', margin: '6px 0' }}>
      <div style={{
        maxWidth: '80%',
        padding: '10px 12px',
        borderRadius: 12,
        background: isUser ? '#0ea5a4' : '#e5e7eb',
        color: isUser ? 'white' : 'black'
      }}>
        <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
      </div>
    </div>
  )
}
