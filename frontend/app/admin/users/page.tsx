"use client"
import React from 'react'
import AdminUsers from '../../../components/Admin/AdminUsers'

export default function AdminUsersPage(){
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Gestion des utilisateurs</h2>
      <AdminUsers />
    </div>
  )
}
