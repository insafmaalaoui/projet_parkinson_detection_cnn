"use client";
import React, { useEffect, useState } from "react";

export default function AssistantPage() {
  const [messages, setMessages] = useState<Array<{from: string; text: string}>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useLLM, setUseLLM] = useState(false);

  useEffect(() => {
    setMessages([
      { from: "assistant", text: "Bonjour — je suis votre Medical Assistant. Posez une question sur la maladie de Parkinson ou sur l'application." },
    ]);

    // detect if user previously stored a provider key
    const key = typeof window !== 'undefined' ? window.localStorage.getItem('groq_key') : null;
    setUseLLM(!!key);
  }, []);

  const pushMessage = (from: string, text: string) => {
    setMessages((m) => [...m, { from, text }]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    pushMessage("user", text);
    setInput("");
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
      const groqKey = typeof window !== 'undefined' ? window.localStorage.getItem('groq_key') : null;

      const body: any = { message: text };
      if (groqKey) body.provider_key = groqKey;

      // call backend explicitly (avoid Next.js dev server returning HTML)
      const res = await fetch("http://localhost:8000/chatbot/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      // try parse JSON, but fallback to text when server returns HTML or plain text
      let data: any = null;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const txt = await res.text();
        // if it's HTML (starts with <!DOCTYPE or <html), surface a friendly message
        if (txt.trim().startsWith("<!")) {
          pushMessage("assistant", `Erreur réseau: le serveur a renvoyé une page HTML (status ${res.status}). Vérifiez que le backend écoute sur http://localhost:8000/chatbot/llm`);
          setLoading(false);
          return;
        }
        try {
          data = JSON.parse(txt);
        } catch (e) {
          data = { response: txt };
        }
      }

      if (res.ok) {
        pushMessage("assistant", data.response || data.message || "(no response)");
      } else {
        pushMessage("assistant", data.detail || JSON.stringify(data));
      }
    } catch (err: any) {
      pushMessage("assistant", `Erreur réseau: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const saveKey = () => {
    const v = (document.getElementById('groq-key') as HTMLInputElement)?.value || '';
    if (v) {
      window.localStorage.setItem('groq_key', v);
      setUseLLM(true);
      pushMessage('assistant', 'Clé Groq enregistrée localement. Le Medical Assistant utilisera le service LLM.');
    }
  };

  const clearKey = () => {
    window.localStorage.removeItem('groq_key');
    setUseLLM(false);
    pushMessage('assistant', 'Clé supprimée. Le Medical Assistant utilisera le mode local.');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Medical Assistant</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700">Clé Groq (optionnelle)</label>
        <div className="flex gap-2 mt-2">
          <input id="groq-key" className="flex-1 border px-3 py-2 rounded" placeholder="Entrez votre clé Groq ici" />
          <button onClick={saveKey} className="px-4 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
          <button onClick={clearKey} className="px-3 py-2 border rounded">Supprimer</button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Si vous fournissez une clé Groq, les requêtes utiliseront l'API LLM. Sinon, le chatbot local (assistant) répondra avec des conseils généraux.</p>
      </div>

      <div className="border rounded p-4 mb-4 h-80 overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block px-3 py-2 rounded ${m.from === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }} className="flex-1 border px-3 py-2 rounded" placeholder="Posez une question..." />
        <button onClick={sendMessage} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded">{loading ? '...' : 'Envoyer'}</button>
      </div>
    </div>
  );
}
