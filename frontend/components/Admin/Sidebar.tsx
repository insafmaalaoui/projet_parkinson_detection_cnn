"use client"
import React from 'react'
import Link from 'next/link'

export default function Sidebar(){
  return (
    <aside className="w-64 bg-slate-50 h-screen border-r p-4 sticky top-0">
      <nav className="space-y-2">
        <Link href="/admin" className="block px-3 py-2 rounded hover:bg-white">Overview</Link>
        <Link href="/admin/patients" className="block px-3 py-2 rounded hover:bg-white">Patients</Link>
        <Link href="/admin/actions" className="block px-3 py-2 rounded hover:bg-white">Actions</Link>
        <Link href="/admin/settings" className="block px-3 py-2 rounded hover:bg-white">Settings</Link>
      </nav>
      {/* Assistant 2 removed */}
      <div className="mt-6 text-xs text-slate-500">© {new Date().getFullYear()} MedAdmin</div>
    </aside>
  )
}
