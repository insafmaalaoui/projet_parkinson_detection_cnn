"use client"
import React, { useEffect, useState } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function AdminUsers(){
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)

  async function load(){
    setLoading(true)
    setError(null)
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/admin/users`, { headers })
      if(res.ok){
        const j = await res.json()
        setUsers(j || [])
      } else {
        setError(`Failed to load users (${res.status})`)
      }
    }catch(e){
      console.error(e)
      setError('Network error while loading users')
    }finally{setLoading(false)}
  }

  useEffect(()=>{ load() }, [])

  async function removeUser(id: string){
    if(!confirm('Supprimer cet utilisateur ?')) return
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE', headers })
      if(res.ok){
        await load()
      } else {
        alert('Échec suppression: '+res.status)
      }
    }catch(e){ console.error(e); alert('Erreur réseau') }
  }

  async function saveEdit(){
    if(!editing) return
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/admin/users/${editing.id}`, { method: 'PUT', headers, body: JSON.stringify(editing) })
      if(res.ok){
        setEditing(null)
        await load()
      } else {
        alert('Échec mise à jour: '+res.status)
      }
    }catch(e){ console.error(e); alert('Erreur réseau') }
  }

  async function createUser(form:any){
    try{
      const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if(res.ok){
        setCreating(false)
        await load()
      } else {
        const text = await res.text()
        alert('Échec création: '+res.status+' '+text)
      }
    }catch(e){ console.error(e); alert('Erreur réseau') }
  }

  if(loading) return <div>Chargement des utilisateurs...</div>
  if(error) return <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Utilisateurs</h3>
        <div>
          <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={()=>setCreating(true)}>Créer un utilisateur</button>
        </div>
      </div>

      {creating ? (
        <UserForm onCancel={()=>setCreating(false)} onSubmit={createUser} />
      ) : null}

      {editing ? (
        <div className="p-4 bg-white rounded shadow mb-4">
          <h4 className="font-medium">Éditer utilisateur</h4>
          <div className="mt-3">
            <label className="block text-sm">Prénom</label>
            <input className="border p-2 w-full" value={editing.first_name||''} onChange={(e)=>setEditing({...editing, first_name: e.target.value})} />
            <label className="block text-sm mt-2">Nom</label>
            <input className="border p-2 w-full" value={editing.last_name||''} onChange={(e)=>setEditing({...editing, last_name: e.target.value})} />
            <label className="block text-sm mt-2">Role</label>
            <input className="border p-2 w-full" value={editing.role||''} onChange={(e)=>setEditing({...editing, role: e.target.value})} />
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={saveEdit}>Enregistrer</button>
              <button className="px-3 py-1 border rounded" onClick={()=>setEditing(null)}>Annuler</button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Créé</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u=> (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.first_name} {u.last_name}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{String(u.created_at)}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 text-sm border rounded" onClick={()=>setEditing(u)}>Éditer</button>
                    <button className="px-2 py-1 text-sm border rounded text-red-600" onClick={()=>removeUser(u.id)}>Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserForm({ onCancel, onSubmit, initial }: any){
  const [form, setForm] = useState<any>(initial || { email: '', password: '', first_name: '', last_name: '', role: 'patient' })
  return (
    <div className="p-4 bg-white rounded shadow mb-4">
      <h4 className="font-medium">Créer un utilisateur</h4>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm">Email</label>
          <input className="border p-2 w-full" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">Mot de passe</label>
          <input className="border p-2 w-full" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">Prénom</label>
          <input className="border p-2 w-full" value={form.first_name} onChange={(e)=>setForm({...form, first_name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">Nom</label>
          <input className="border p-2 w-full" value={form.last_name} onChange={(e)=>setForm({...form, last_name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm">Role</label>
          <select className="border p-2 w-full" value={form.role} onChange={(e)=>setForm({...form, role: e.target.value})}>
            <option value="patient">Patient</option>
            <option value="neurologist">Neurologist</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={()=>onSubmit(form)}>Créer</button>
        <button className="px-3 py-1 border rounded" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  )
}
