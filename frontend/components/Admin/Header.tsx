"use client"
import React from 'react'

export default function Header(){
  return (
    <header className="w-full bg-white border-b py-3 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-semibold text-indigo-600">MedAdmin</div>
        <div className="text-sm text-slate-500">Parkinson Detection Dashboard</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-600">Bonjour, Admin</div>
        <button className="px-3 py-1 bg-indigo-600 text-white rounded">Déconnexion</button>
      </div>
    </header>
  )
}
