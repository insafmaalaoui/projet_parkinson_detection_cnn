"use client"
import React from 'react'
import Link from 'next/link'
import AdminPatientArchive from '../../components/Admin/AdminPatientArchive'
import AdminActionsList from '../../components/Admin/AdminActionsList'
import AdminOverviewStats from '../../components/Admin/AdminOverviewStats'

export default function AdminOverview(){
  return (
    <div className="space-y-6">
      <AdminOverviewStats />

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Archive (aperçu)</h3>
          <AdminPatientArchive />
          <div className="mt-3 text-right"><Link href="/admin/patients" className="text-indigo-600 hover:underline">Voir tous les patients →</Link></div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Actions récentes</h3>
          <AdminActionsList />
          <div className="mt-3 text-right"><Link href="/admin/actions" className="text-indigo-600 hover:underline">Voir toutes les actions →</Link></div>
        </div>
      </div>
    </div>
  )
}
