"use client"
import React from 'react'
import AdminPatientArchive from '../../../components/Admin/AdminPatientArchive'
import AdminCases from '../../../components/Admin/AdminCases'

export default function PatientsPage(){
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Patients</h2>
      <div className="mb-6">
        <AdminCases />
      </div>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Archive</h3>
        <AdminPatientArchive />
      </div>
    </div>
  )
}
