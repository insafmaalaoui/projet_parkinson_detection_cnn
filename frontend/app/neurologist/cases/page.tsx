"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import NeurologistSidebar from "@/components/NeurologistSidebar";
import PatientInfoModal from "@/components/PatientInfoModal";
import { Button } from "@/components/ui/button";

export default function CasesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientFilter = searchParams.get('patient');

  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCaseId, setModalCaseId] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientFilter]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vous devez être connecté en tant que neurologue');
        router.push('/login');
        return;
      }
      const res = await fetch('http://localhost:8000/neurologist/cases', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        alert('Erreur lors de la récupération des dossiers');
        return;
      }
      const data = await res.json();
      if (patientFilter) {
        setCases(data.filter((c: any) => c.patient_id === patientFilter));
      } else {
        setCases(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = (pdfPath: string | null) => {
    if (!pdfPath) return alert('Aucun PDF disponible');
    window.open(`http://localhost:8000${pdfPath}`, '_blank');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NeurologistSidebar />
      <div className="flex-1">
        <main className="max-w-7xl mx-auto p-6">
          <header className="relative bg-white rounded-2xl overflow-hidden shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold">Dossiers</h1>
            {patientFilter && <p className="text-sm text-slate-500">Filtré pour le patient: {patientFilter}</p>}
          </header>

          {loading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : cases.length === 0 ? (
            <div className="medical-card p-12 text-center">Aucun dossier trouvé</div>
          ) : (
            <div className="grid gap-4">
              {cases.map((c) => (
                <div key={c.id} className="medical-card p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{c.patient_name}</p>
                    <p className="text-sm text-slate-500">Dossier #{c.id.slice(0, 8)} • {new Date(c.created_at).toLocaleDateString()}</p>
                    <p className="text-sm text-slate-600 mt-2">Statut: {c.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setModalCaseId(c.id)} variant="outline">Info patient</Button>
                    <Button onClick={() => downloadPdf(c.report_pdf)} className="bg-blue-600 text-white">Télécharger PDF</Button>
                    <Button onClick={() => router.push(`/neurologist/case/${c.id}`)}>Voir</Button>
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
