"use client"
import React, { useState, FormEvent } from 'react'

type Props = {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = value.trim()
    if (!text) return
    onSend(text)
    setValue('')
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Écrire un message..."
        disabled={disabled}
        style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
      />
      <button type="submit" disabled={disabled} style={{ padding: '10px 14px', borderRadius: 8, background: '#0ea5a4', color: 'white', border: 'none' }}>
        Envoyer
      </button>
    </form>
  )
}
