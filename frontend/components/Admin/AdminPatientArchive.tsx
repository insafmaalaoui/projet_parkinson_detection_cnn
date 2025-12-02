"use client"
import React, {useEffect, useState} from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

export default function AdminPatientArchive(){
  const [archive, setArchive] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(){
    setLoading(true)
    setError(null)
    try{
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers: any = {}
      if(token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`${API_BASE}/admin/patients_archive`, { headers })
      if(res.ok){
        const j = await res.json()
        setArchive(j.archive || [])
      } else {
        if(res.status === 401 || res.status === 403){
          setError("Accès refusé — connectez-vous en tant qu'administrateur.")
        } else {
          setError(`Échec du chargement de l'archive (${res.status})`)
        }
        console.error('Failed to load archive', res.status)
      }
    }catch(e){
      console.error(e)
      setError('Erreur réseau lors du chargement de l\'archive')
    }finally{setLoading(false)}
  }

  useEffect(()=>{ load() }, [])

  if(loading) return <div>Chargement de l'archive...</div>
  if(error) return (
    <div className="p-4 bg-red-50 text-red-700 rounded">
      <div>{error}</div>
      <div className="mt-2">
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => load()}>Réessayer</button>
      </div>
    </div>
  )
  if(archive.length===0) return <div>Aucune fiche trouvée</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-2">Archive des dossiers patients</h3>
      <div className="space-y-3">
        {archive.map((c:any)=> (
          <div key={c.case_id} className="border p-3 rounded">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">Dossier: {c.case_id}</div>
                <div className="text-sm text-slate-600">Patient: {c.patient.first_name} {c.patient.last_name} ({c.patient.email})</div>
                <div className="text-sm">Statut: {c.status}</div>
              </div>
              <div className="text-right text-sm text-slate-500">Créé: {String(c.created_at)}</div>
            </div>

            {c.patient_info ? (
              <div className="mt-2 text-sm bg-slate-50 p-2 rounded">
                <div><strong>Info patient:</strong></div>
                <div>Age: {c.patient_info.age ?? '-'} | Sexe: {c.patient_info.gender ?? '-'}</div>
              </div>
            ) : null}

            <div className="mt-2">
              <strong>Images:</strong>
              <div className="flex gap-2 mt-2 flex-wrap">
                {c.images.map((img:any)=> (
                  <div key={img.id} className="w-48 h-auto bg-gray-50 rounded overflow-hidden border p-2">
                    <div className="text-xs mb-1 text-slate-600">{img.filename}</div>
                    <a href={img.url} target="_blank" rel="noreferrer" className="block text-sm text-indigo-600 hover:underline">Ouvrir le fichier DICOM</a>
                    <div className="text-xs text-slate-500 mt-1">(.dcm)</div>
                  </div>
                ))}
              </div>
            </div>

            {c.neurologist_report ? (
              <div className="mt-2 bg-white/50 p-2 rounded">
                <strong>Rapport neurologue:</strong>
                <div className="text-sm mt-1 whitespace-pre-wrap">{c.neurologist_report}</div>
              </div>
            ) : null}

            {c.report_pdf ? (
              <div className="mt-2">
                <a href={c.report_pdf} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">Télécharger le rapport PDF</a>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
