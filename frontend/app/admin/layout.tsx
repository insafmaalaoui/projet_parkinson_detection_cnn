import React from 'react'
import Header from '../../components/Admin/Header'
import Sidebar from '../../components/Admin/Sidebar'

export const metadata = {
  title: 'Admin - MedAdmin'
}

export default function AdminLayout({ children }: { children: React.ReactNode }){
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header and Sidebar are client components; server layout may import them */}
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
