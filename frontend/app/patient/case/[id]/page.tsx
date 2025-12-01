"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import PatientSidebar from "@/components/PatientSidebar";
import UploadPreview from '@/components/UploadPreview'

interface CaseDetail {
  id: string;
  created_at?: string;
  status?: string;
  neurologist_report?: string | null;
  images_count?: number;
  description?: string;
  report_pdf?: string | null;
}

interface NeurologistDetail {
  id: string;
  patient_name?: string;
  description?: string;
  status?: string;
  cnn_prediction?: number | null;
  images?: { id: string; url: string }[];
}

export default function CasePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [caseInfo, setCaseInfo] = useState<CaseDetail | null>(null);
  const [neuroInfo, setNeuroInfo] = useState<NeurologistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const resCases = await fetch("http://localhost:8000/cases", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resCases.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          router.push("/login");
          return;
        }
        const cases = await resCases.json();
        const found = (cases || []).find((c: any) => String(c.id) === String(id));
        if (found) {
          setCaseInfo(found);
          setEditDesc(found.description ?? "");
        }

        const resNeuro = await fetch(`http://localhost:8000/neurologist/case/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resNeuro.ok) {
          const nd = await resNeuro.json();
          setNeuroInfo(nd);
          if (!editDesc && nd.description) setEditDesc(nd.description);
        }
      } catch (err) {
        console.error(err);
        setError("Impossible de charger les détails du dossier.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const saveDescription = async () => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    try {
      await fetch(`http://localhost:8000/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: editDesc }),
      });
      // refresh list
      const resCases = await fetch("http://localhost:8000/cases", { headers: { Authorization: `Bearer ${token}` } });
      const cases = await resCases.json();
      const found = (cases || []).find((c: any) => String(c.id) === String(id));
      if (found) setCaseInfo(found);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append('files', f));
      const res = await fetch(`http://localhost:8000/cases/${id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        // refresh images
        const resNeuro = await fetch(`http://localhost:8000/neurologist/case/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (resNeuro.ok) setNeuroInfo(await resNeuro.json());
        const resCases = await fetch("http://localhost:8000/cases", { headers: { Authorization: `Bearer ${token}` } });
        const cases = await resCases.json();
        const found = (cases || []).find((c: any) => String(c.id) === String(id));
        if (found) setCaseInfo(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    try {
      const res = await fetch(`http://localhost:8000/cases/${id}/images/${imageId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const resNeuro = await fetch(`http://localhost:8000/neurologist/case/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (resNeuro.ok) setNeuroInfo(await resNeuro.json());
        const resCases = await fetch("http://localhost:8000/cases", { headers: { Authorization: `Bearer ${token}` } });
        const cases = await resCases.json();
        const found = (cases || []).find((c: any) => String(c.id) === String(id));
        if (found) setCaseInfo(found);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeCase = async () => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    try {
      const res = await fetch(`http://localhost:8000/cases/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) router.push('/patient');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <Button onClick={() => router.back()} className="mt-4">Retour</Button>
      </div>
    );
  }

  if (!caseInfo && !neuroInfo) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Dossier introuvable.</p>
        <Button onClick={() => router.back()} className="mt-4">Retour</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PatientSidebar />
      <div className="flex-1">
        <main className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Dossier #{(caseInfo?.id ?? neuroInfo?.id)?.toString().slice(0,8)}</h2>
                <p className="text-sm text-slate-500">Créé le {caseInfo?.created_at ? new Date(caseInfo.created_at).toLocaleString('fr-FR') : '—'}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Statut</div>
                <div className={`mt-1 px-3 py-1 rounded-full text-sm font-medium ${caseInfo?.status === 'completed' ? 'bg-green-100 text-green-800' : caseInfo?.status === 'analyzed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{caseInfo?.status ?? neuroInfo?.status}</div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium">Description</h3>
              <textarea value={editDesc ?? ''} onChange={(e) => setEditDesc(e.target.value)} className="w-full mt-2 border rounded p-3" rows={5} />
              <div className="mt-3 flex gap-3">
                <Button onClick={saveDescription}>Sauvegarder</Button>
                <Button variant="outline" onClick={() => { setEditDesc(caseInfo?.description ?? neuroInfo?.description ?? ''); }}>Réinitialiser</Button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium">Images</h3>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(neuroInfo?.images ?? []).map((img) => (
                  <div key={img.id} className="border rounded p-2 bg-white">
                    <UploadPreview src={img.url?.startsWith('http') ? img.url : `http://localhost:8000${img.url}`} alt={img.filename ?? img.id} className="w-full h-32 rounded" />
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-slate-600">#{String(img.id).slice(0,6)}</span>
                      <button className="text-red-600 text-sm" onClick={() => deleteImage(img.id)}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700">Ajouter des images</label>
                <input type="file" multiple onChange={(e) => handleUpload(e.target.files)} className="mt-2" />
                {uploading && <p className="text-sm text-slate-500 mt-2">Envoi en cours...</p>}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium">Rapport du neurologue</h3>
              {caseInfo?.status === 'completed' && caseInfo?.neurologist_report ? (
                <div className="mt-2 bg-white border rounded p-4">
                  <p className="text-slate-700 whitespace-pre-line">{caseInfo.neurologist_report}</p>
                </div>
              ) : (
                <p className="text-slate-500 mt-2">Le rapport du neurologue n'est pas encore disponible.</p>
              )}
              {caseInfo?.report_pdf && (
                <div className="mt-3">
                  <a href={`http://localhost:8000${caseInfo.report_pdf}`} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">Télécharger le rapport PDF</a>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={() => router.back()}>Retour</Button>
              <Button variant="outline" onClick={() => router.push('/patient')}>Tableau de bord</Button>
              <Button variant="destructive" onClick={removeCase}>Supprimer le dossier</Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
