"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NeurologistSidebar from "@/components/NeurologistSidebar";
import PatientInfoModal from "@/components/PatientInfoModal";
import { Button } from "@/components/ui/button";

export default function TreatedCasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCaseId, setModalCaseId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/neurologist/treated", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NeurologistSidebar />
      <div className="flex-1">
        <main className="max-w-7xl mx-auto p-6">
          <header className="relative bg-white rounded-2xl overflow-hidden shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold">Dossiers traités</h1>
          </header>

          {loading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : cases.length === 0 ? (
            <div className="medical-card p-12 text-center">Aucun dossier traité</div>
          ) : (
            <div className="grid gap-4">
              {cases.map((c) => (
                <div key={c.id} className="medical-card p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{c.patient_name}</p>
                    <p className="text-sm text-slate-500">Dossier #{c.id.slice(0, 8)} • {new Date(c.created_at).toLocaleDateString()}</p>
                    <p className="text-sm text-slate-600 mt-2">Rapport: {c.report_pdf ? <a href={`http://localhost:8000${c.report_pdf}`} target="_blank" rel="noreferrer" className="text-blue-600">Télécharger PDF</a> : '—'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setModalCaseId(c.id)} className="bg-slate-100">Info patient</Button>
                    <Button onClick={() => {
                      const token = localStorage.getItem('token');
                      if (!token) {
                        alert('Vous devez être connecté en tant que neurologue pour voir ce dossier.');
                        router.push('/login');
                        return;
                      }
                      router.push(`/neurologist/case/${c.id}`);
                    }} className="bg-white">Voir</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <PatientInfoModal caseId={modalCaseId} open={!!modalCaseId} onClose={() => setModalCaseId(null)} />
    </div>
  );
}
