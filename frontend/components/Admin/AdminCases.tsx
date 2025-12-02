"use client"
import React, {useEffect, useState} from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function AdminCases(){
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewCase, setViewCase] = useState<any | null>(null)
  const [patientInfo, setPatientInfo] = useState<any | null>(null)

  async function load(){
    setLoading(true); setError(null)
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/admin/cases`, { headers })
      if(res.ok){
        const j = await res.json()
        setCases(j.cases || [])
      } else {
        setError(`Failed to load cases (${res.status})`)
      }
    }catch(e){ console.error(e); setError('Network error') }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  async function view(id:string){
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/admin/cases/${id}`, { headers })
      if(res.ok){ const data = await res.json(); setViewCase(data); setPatientInfo(null) }
      else alert('Failed to load case: '+res.status)
    }catch(e){ console.error(e); alert('Network error') }
  }

  async function remove(id:string){
    if(!confirm('Supprimer ce dossier ?')) return
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/admin/cases/${id}`, { method: 'DELETE', headers })
      if(res.ok){ await load() }
      else alert('Échec suppression: '+res.status)
    }catch(e){ console.error(e); alert('Network error') }
  }

  async function reanalyze(id:string){
    if(!confirm('Relancer l\'analyse CNN pour ce dossier ?')) return
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/admin/cases/${id}/reanalyze`, { method: 'POST', headers })
      if(res.ok){ alert('Analyse relancée') }
      else alert('Échec relance: '+res.status)
    }catch(e){ console.error(e); alert('Network error') }
  }

  async function loadPatientInfo(patientId:string){
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = { 'Content-Type': 'application/json' }
      if(token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/admin/patient/${patientId}`, { headers })
      if(res.ok){ setPatientInfo(await res.json()) }
      else alert('Échec chargement info patient: '+res.status)
    }catch(e){ console.error(e); alert('Erreur réseau') }
  }

  if(loading) return <div>Chargement des dossiers...</div>
  if(error) return <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gestion des dossiers</h3>
        <div className="text-sm text-slate-500">{cases.length} dossiers</div>
      </div>

      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Patient</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-left">Images</th>
              <th className="p-3 text-left">Prédiction</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map(c=> (
              <tr key={c.id} className="border-t">
                <td className="p-3">{c.id.slice(0,8)}</td>
                <td className="p-3">{c.patient_name}</td>
                <td className="p-3">{c.status}</td>
                <td className="p-3">{c.images_count}</td>
                <td className="p-3">{c.cnn_prediction_num ? String(c.cnn_prediction_num) : '-'}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 text-sm border rounded" onClick={()=>view(c.id)}>Voir</button>
                    <button className="px-2 py-1 text-sm border rounded" onClick={()=>reanalyze(c.id)}>Relancer</button>
                    <button className="px-2 py-1 text-sm border rounded text-red-600" onClick={()=>remove(c.id)}>Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewCase ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded shadow-lg p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Dossier {viewCase.id}</h4>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={()=>setViewCase(null)}>Fermer</button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-500">Patient</div>
                <div className="font-medium">{viewCase.patient.first_name} {viewCase.patient.last_name} ({viewCase.patient.email})</div>
                <div className="mt-2 text-sm">Statut: {viewCase.status}</div>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={()=>loadPatientInfo(viewCase.patient.id)}>Voir info patient</button>
                </div>
                {viewCase.neurologist_report ? (
                  <div className="mt-3 p-3 bg-slate-50 rounded"><strong>Rapport:</strong><div className="whitespace-pre-wrap mt-1 text-sm">{viewCase.neurologist_report}</div></div>
                ) : null}
              </div>

              <div>
                <div className="text-sm text-slate-500">Images</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {viewCase.images.map((img:any)=> (
                    <div key={img.id} className="w-48 h-auto bg-gray-50 rounded overflow-hidden border p-2">
                      <div className="text-xs mb-1 text-slate-600">{img.filename}</div>
                      <a className="block text-sm text-indigo-600 hover:underline" href={img.url} target="_blank" rel="noreferrer">Ouvrir le fichier DICOM</a>
                      <div className="text-xs text-slate-500 mt-1">(.dcm)</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mt-4">
        {patientInfo ? (
          <div className="p-4 bg-slate-50 rounded border">
            <h5 className="font-medium">Info patient</h5>
            <pre className="text-xs whitespace-pre-wrap mt-2">{JSON.stringify(patientInfo, null, 2)}</pre>
          </div>
        ) : null}
      </div>
    </div>
  )
}
