import React from 'react'
import NeurologistSidebar from '@/components/NeurologistSidebar'
import DashboardHeader from '@/components/ui/DashboardHeader'
import ChatWindow from '@/components/Chat/ChatWindow'

export const metadata = {
  title: 'Chatbot médical',
}

export default function Page() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <NeurologistSidebar />

      <div className="flex-1">
        <main className="max-w-7xl mx-auto p-6">
          <DashboardHeader
            title={`Assistant médical`}
            subtitle="Posez des questions cliniques — RAG + base patient"
            avatarText={"A"}
            primaryLabel={undefined}
          />

          <div className="mt-6">
            <ChatWindow />
          </div>
        </main>
      </div>
    </div>
  )
}
