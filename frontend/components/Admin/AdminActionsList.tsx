"use client"
import React, {useEffect, useState} from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function AdminActionsList(){
  const [actions, setActions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(){
    setLoading(true)
    setError(null)
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = {}
      if(token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/admin/user_actions`, { headers })
      if(res.ok){
        const j = await res.json()
        setActions(j.actions || [])
      } else {
        if(res.status === 401 || res.status === 403){
          setError("Accès refusé — connectez-vous en tant qu'administrateur.")
        } else {
          setError(`Échec du chargement des actions (${res.status})`)
        }
        console.error('Failed to load actions', res.status)
      }
    }catch(e){
      console.error(e)
      setError('Erreur réseau lors du chargement des actions')
    }finally{setLoading(false)}
  }

  useEffect(()=>{ load() }, [])

  if(loading) return <div>Chargement des actions...</div>
  if(error) return (
    <div className="p-4 bg-red-50 text-red-700 rounded">
      <div>{error}</div>
      <div className="mt-2">
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => load()}>Réessayer</button>
      </div>
    </div>
  )
  if(actions.length===0) return <div>Aucune action récente</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-2">Actions récentes</h3>
      <ul className="space-y-2 text-sm">
        {actions.map((a, idx)=> (
          <li key={idx} className="border p-2 rounded">
            <div className="text-xs text-slate-500">{a.timestamp}</div>
            <div className="font-medium">{a.type.replace('_',' ')}</div>
            <div className="text-xs text-slate-600">{a.email ? a.email : a.case_id ? `Case ${a.case_id}` : ''}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
