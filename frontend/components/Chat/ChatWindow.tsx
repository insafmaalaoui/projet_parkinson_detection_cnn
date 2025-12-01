"use client"
import React, { useEffect, useRef, useState } from 'react'
import { FiUsers, FiActivity, FiHeart, FiTrendingUp } from 'react-icons/fi'
import ChatInput from './ChatInput'

type Message = { id: string; sender: 'user' | 'bot'; text: string; isField?: boolean; rawValue?: string }

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

const FIELD_KEYWORDS = [
  'resume', 'résumé', 'résumé clinique', 'resume clinique',
  'examen', 'examen clinique', 'conclusion', 'diagnostic',
  'updrs', 'score updrs', 'recommandation', 'recommandations',
  'examens', 'examens complementaires', 'plan de suivi', 'suivi', 'notes'
]

function normalizeText(s?: string) {
  if (!s) return ''
  try {
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  } catch (e) {
    return s.toLowerCase()
  }
}

function looksLikeFieldQuestion(text: string) {
  const t = normalizeText(text)
  return FIELD_KEYWORDS.some(k => t.includes(k))
}

function sanitizeAssistantContent(text?: string) {
  if (!text) return ''
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
  let cleaned = text.replace(uuidRegex, '')
  cleaned = cleaned.replace(/Patient ID:?\s*\w*/gi, '')
  cleaned = cleaned.replace(/User ID:?\s*\w*/gi, '')
  cleaned = cleaned.replace(/\n{2,}/g, '\n').trim()
  return cleaned
}

function findDcmToken(s?: string) {
  if (!s) return null
  // find token that ends with .dcm, may be full path (/uploads/xxx.dcm) or filename
  const m = s.match(/(https?:\/\/[^\s"']+\.dcm|\/[^\s"']+\.dcm|[\w\-]+\.dcm)/i)
  return m ? m[0] : null
}

function renderDcmLink(raw: string | undefined) {
  const token = findDcmToken(raw)
  if (!token) return null
  let url = token
  if (!/^https?:\/\//i.test(token) && !token.startsWith('/')) {
    // assume backend serves uploads at API_BASE/uploads/<filename>
    url = `${API_BASE.replace(/\/$/, '')}/uploads/${token}`
  } else if (token.startsWith('/')) {
    // absolute path on same origin; prepend API_BASE host
    const base = API_BASE.replace(/\/$/, '')
    url = `${base}${token}`
  }

  const name = token.split('/').pop() || token
  return (
    <DcmPreview token={token} name={name} url={url} />
  )
}

function DcmPreview({ token, name, url }: { token: string; name: string; url: string }) {
  const [imgError, setImgError] = useState(false)

  // Always request previews from the preview endpoint. The backend will lazily generate
  // `/uploads/previews/<name>.png` from the corresponding `.dcm` file when requested.
  const pngUrl = `${API_BASE.replace(/\/$/, '')}/uploads/previews/${name}.png`

  return (
    <div>
      {!imgError ? (
        // Try to show generated preview; fallback to link on error
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pngUrl} alt={name} className="max-w-full rounded shadow-sm mb-2" onError={() => setImgError(true)} />
      ) : null}
      {imgError && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">{name}</a>
      )}
      {!imgError && (
        <div className="text-xs text-slate-400">Cliquez pour ouvrir le fichier DICOM</div>
      )}
    </div>
  )
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [patients, setPatients] = useState<Array<{id:string,name:string}>>([])
  const [selectedPatient, setSelectedPatient] = useState<string | ''>('')
  const [stats, setStats] = useState<any>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadStats()
    loadPatientsList()
    const t = setInterval(loadPatientsList, 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    // scroll to bottom on messages change
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function loadStats() {
    try {
      const res = await fetch(`${API_BASE}/api/stats`)
      if (!res.ok) return
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('Erreur chargement stats:', e)
      addNotification('❌ Erreur de connexion au serveur')
    }
  }

  async function loadPatientsList() {
    try {
      const res = await fetch(`${API_BASE}/api/patients`)
      if (!res.ok) return
      const data = await res.json()
      const list = data.patients || []
      setPatients(list)
      // compute average age from details as in original
      computeAverageFromDetails()
    } catch (e) {
      console.error('Erreur chargement patients:', e)
    }
  }

  async function computeAverageFromDetails() {
    try {
      const resp = await fetch(`${API_BASE}/api/patients/details`)
      if (!resp.ok) return
      const data = await resp.json()
      const list = data.patients || []
      const ages = list.map((p:any)=>p.computed_age).filter((a:any)=>typeof a==='number' && !isNaN(a))
      if (!ages.length) return
      const sum = ages.reduce((s:number,v:number)=>s+v,0)
      const avg = Math.round((sum/ages.length)*10)/10
      setStats((s:any)=>({...s, age_moyen: avg}))
    } catch (e) {
      console.error('Erreur computeAverageFromDetails:', e)
    }
  }

  function addMessage(msg: Message) {
    setMessages((m)=>[...m, msg])
  }

  function addLoadingMessage() {
    const id = 'loading-' + Date.now()
    const msg: Message = { id, sender: 'bot', text: '...', }
    addMessage(msg)
    return id
  }

  function removeLoadingMessage(id: string) {
    setMessages((m)=>m.filter(x=>x.id!==id))
  }

  function addNotification(text: string) {
    // simple notification via alert fallback
    try { window.alert(text) } catch(e){}
  }

  async function sendMessage(text: string) {
    if (!text || isProcessing) return
    setIsProcessing(true)
    addMessage({ id: String(Date.now()) + '-u', sender: 'user', text })
    const loadingId = addLoadingMessage()

    try {
      const patientId = selectedPatient || null
      if (looksLikeFieldQuestion(text)) {
        const res = await fetch(`${API_BASE}/api/chat/field`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ case_id: patientId, message: text })
        })
        const data = await res.json()
        removeLoadingMessage(loadingId)
        if (data.type === 'fields' && data.fields) {
          for (const k of Object.keys(data.fields)) {
            const v = String(data.fields[k] || 'non disponible')
            addMessage({ id: String(Date.now()) + '-b', sender: 'bot', text: `${k.replace(/_/g,' ')}: ${v}`, isField: true, rawValue: v })
          }
        } else if (data.type === 'not_field') {
          addMessage({ id: String(Date.now()) + '-b', sender: 'bot', text: data.message || 'Question non reconnue' })
        } else if (data.error) {
          addMessage({ id: String(Date.now()) + '-b', sender: 'bot', text: 'Erreur génération: ' + (data.error||'') })
        } else {
          addMessage({ id: String(Date.now()) + '-b', sender: 'bot', text: JSON.stringify(data) })
        }
      } else {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ question: text, patient_id: patientId })
        })
        if (!res.ok) throw new Error('Network error')
        const data = await res.json()
        removeLoadingMessage(loadingId)
        const cleaned = sanitizeAssistantContent(data.response || '')
        addMessage({ id: String(Date.now()) + '-b', sender: 'bot', text: cleaned || 'Aucune donnée trouvée.' })
      }
    } catch (err:any) {
      removeLoadingMessage(loadingId)
      addMessage({ id: String(Date.now()) + '-e', sender: 'bot', text: '❌ Erreur de connexion au serveur. Vérifiez que le backend est démarré.' })
    } finally {
      setIsProcessing(false)
    }
  }

  async function askQuestion(q: string) {
    // prefill and send
    await sendMessage(q)
  }

  return (
    <div className="w-full max-w-6xl mx-auto my-6 h-[85vh]">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-600 to-teal-500 text-white">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold">CM</div>
            <h1 className="text-lg font-semibold">Assistant Médical — Chatbot</h1>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedPatient} onChange={(e)=>setSelectedPatient(e.target.value)} className="px-3 py-2 rounded-lg bg-white text-slate-700 shadow-sm border border-white/20">
              <option value="">Tous les patients</option>
              {patients.map(p=> <option key={p.id} value={p.id}>{p.name||p.id}</option>)}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-b bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm">
              <div className="p-2 rounded-md bg-sky-100 text-sky-600"><FiUsers size={20} /></div>
              <div>
                <div className="text-xs text-slate-500">Total patients</div>
                <div className="text-lg font-bold">{stats.total_patients||0}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm">
              <div className="p-2 rounded-md bg-amber-100 text-amber-600"><FiActivity size={20} /></div>
              <div>
                <div className="text-xs text-slate-500">Tremblements</div>
                <div className="text-lg font-bold">{stats.avec_tremblements||0}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm">
              <div className="p-2 rounded-md bg-rose-100 text-rose-600"><FiHeart size={20} /></div>
              <div>
                <div className="text-xs text-slate-500">Dépression</div>
                <div className="text-lg font-bold">{stats.avec_depression||0}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm">
              <div className="p-2 rounded-md bg-green-100 text-green-600"><FiTrendingUp size={20} /></div>
              <div>
                <div className="text-xs text-slate-500">Âge moyen</div>
                <div className="text-lg font-bold">{stats.age_moyen||0} ans</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col bg-slate-50">
            <div className="flex-1 p-6 overflow-auto" id="chatMessages" ref={messagesRef}>
              {messages.length===0 && (
                <div style={{ textAlign:'center', padding:40, color:'#666' }}>
                  <h2 className="text-2xl font-semibold text-slate-700">Assistant clinique</h2>
                  <p className="mt-2 text-slate-500">Interrogez l'historique médical des patients et obtenez des réponses structurées basées sur les dossiers.</p>
                </div>
              )}

              {messages.map(m=> (
                <div key={m.id} className={`flex items-start gap-4 mb-4 ${m.sender==='user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${m.sender==='user' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>{m.sender==='user' ? 'DR' : 'CM'}</div>
                  <div className={`${m.sender==='user' ? 'text-right' : 'text-left'} max-w-[70%]` }>
                    <div className={`inline-block px-4 py-3 rounded-2xl ${m.sender==='user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border'}`} style={{ whiteSpace: 'pre-wrap' }}>
                      {/* If the content contains a .dcm reference, render filename link instead of raw blob */}
                      {findDcmToken(m.text) ? (
                        <div>{renderDcmLink(m.text)}</div>
                      ) : (
                        <span>{m.text}</span>
                      )}
                    </div>
                    {m.isField && m.rawValue && (
                      <div className="mt-2 flex items-center gap-3">
                        {findDcmToken(m.rawValue) ? (
                          <div>{renderDcmLink(m.rawValue)}</div>
                        ) : (
                          <>
                            <button className="text-sm px-3 py-1 rounded-md bg-slate-100" onClick={()=>navigator.clipboard.writeText(m.rawValue || '')}>Copier</button>
                            <div className="text-xs text-slate-500">{String(m.rawValue)}</div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-1">{new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t">
              <div className="flex gap-3 items-center">
                <textarea id="userInput" rows={1} className="flex-1 px-4 py-3 border rounded-2xl resize-none" placeholder="Posez votre question..." onKeyDown={(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); const val=(e.target as HTMLTextAreaElement).value.trim(); if(val) { (e.target as HTMLTextAreaElement).value=''; sendMessage(val) } } }} />
                <button className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow" onClick={()=>{ const el=document.getElementById('userInput') as HTMLTextAreaElement; const v=el?.value?.trim(); if(v){ el.value=''; sendMessage(v) } }} disabled={isProcessing}>Envoyer</button>
              </div>
            </div>
          </div>
          <aside className="w-80 p-6 border-l bg-white">
            <h3 className="text-lg font-semibold mb-3">Questions rapides</h3>
            <div className="flex flex-col gap-3 mb-6">
              <button className="text-sm text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100" onClick={()=>askQuestion('Combien de patients avons-nous ?')}>Nombre de patients</button>
              <button className="text-sm text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100" onClick={()=>askQuestion('Quels sont les symptômes les plus fréquents ?')}>Symptômes fréquents</button>
              <button className="text-sm text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100" onClick={()=>askQuestion('Quel est le profil moyen des patients ?')}>Profil moyen</button>
              <button className="text-sm text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100" onClick={()=>askQuestion('Liste les patients avec tremblements')}>Patients avec tremblements</button>
              <button className="text-sm text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100" onClick={()=>askQuestion('Quels patients ont des troubles cognitifs ?')}>Troubles cognitifs</button>
              <button className="text-sm text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100" onClick={()=>askQuestion('Statistiques de dépression et anxiété')}>Dépression/Anxiété</button>
            </div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">À propos</h3>
            <p className="text-sm text-slate-500">Cet assistant clinique analyse les données patients et restitue des réponses structurées basées sur les dossiers médicaux.</p>
          </aside>
        </div>
      </div>
    </div>
  )
}
