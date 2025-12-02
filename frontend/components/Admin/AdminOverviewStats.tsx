"use client"
import React, { useEffect, useState, useRef } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

function useCountUp(target:number, duration=800){
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(()=>{
    const start = performance.now()
    const from = 0
    const to = target
    const step = (now:number) =>{
      const t = Math.min(1, (now - start)/duration)
      const eased = t<.5 ? 2*t*t : -1 + (4-2*t)*t
      const cur = Math.round(from + (to-from)*eased)
      setValue(cur)
      if(t<1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return ()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current) }
  },[target,duration])

  return value
}

export default function AdminOverviewStats(){
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ total:0, pending:0, completed:0, avg_confidence:0 })

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      setError(null)
      try{
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const headers: any = {}
        if(token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${API_BASE}/admin/stats`, { headers })
        if(!res.ok){
          if(res.status===401||res.status===403) setError("Accès refusé — connectez-vous en tant qu'administrateur.")
          else setError(`Erreur serveur (${res.status})`)
          setLoading(false)
          return
        }
        const j = await res.json()
        // server returns numbers: total, pending, analyzed, completed, avg_prediction
        const total = j.total || 0
        // per user request: 'En attente' should reflect analyzed count
        const pending = j.analyzed || 0
        const completed = j.completed || 0
        const avg = j.avg_prediction || 0
        if(mounted) setStats({ total, pending, completed, avg_confidence: avg })
      }catch(e:any){
        console.error(e)
        if(mounted) setError('Erreur réseau lors du chargement des statistiques')
      }finally{ if(mounted) setLoading(false) }
    }
    load()
    return ()=>{ mounted = false }
  },[])

  const totalCount = useCountUp(stats.total, 900)
  const pendingCount = useCountUp(stats.pending, 900)
  const completedCount = useCountUp(stats.completed, 900)
  const avgConf = stats.avg_confidence

  if(loading) return <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=> <div key={i} className="h-28 bg-gradient-to-r from-slate-50 to-white rounded-lg shadow p-4 animate-pulse" />)}</div>
  if(error) return <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>

  return (
    <div className="grid grid-cols-3 gap-6">
      <StatCard title="Dossiers totaux" value={totalCount} icon="📁" gradient="from-indigo-900 to-violet-500" />
      <StatCard title="En attente" value={pendingCount} icon="⏳" gradient="from-yellow-400 to-amber-500" />
      <StatCard title="Terminés" value={completedCount} icon="✅" gradient="from-green-400 to-teal-500" />

      <div className="col-span-3 mt-4">
        <div className="p-6 bg-white/80 backdrop-blur rounded-xl shadow-lg border border-white/20 flex items-center gap-6">
          <div className="flex-1">
            <h4 className="text-sm text-slate-500">Prédiction moyenne CNN</h4>
            <div className="flex items-baseline gap-4">
              <div className="text-3xl font-bold">{avgConf}%</div>
              <div className="text-sm text-slate-600">Moyenne sur les cas avec prédiction</div>
            </div>
          </div>
          <div className="w-40 h-20 bg-gradient-to-tr from-indigo-100 to-white rounded-lg shadow-inner flex items-center justify-center">
            <div className="text-sm text-indigo-700">Confidence</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, gradient }:{ title:string, value:number, icon:string, gradient:string }){
  return (
    <div className={`p-5 rounded-2xl transform hover:-translate-y-2 transition-all duration-300 ${gradient} text-white shadow-2xl`}>
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">{title}</div>
        <div className="text-3xl">{icon}</div>
      </div>
      <div className="mt-4 text-4xl font-extrabold drop-shadow">{value}</div>
    </div>
  )
}
