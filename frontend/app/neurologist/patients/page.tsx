"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import NeurologistSidebar from "@/components/NeurologistSidebar";
import { Button } from "@/components/ui/button";
import PatientInfoModal from "@/components/PatientInfoModal";

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalPatientId, setModalPatientId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/neurologist/patients', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPatients(data);
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
            <h1 className="text-2xl font-bold">Patients</h1>
            <p className="text-sm text-slate-500">Liste de tous les patients et informations de base</p>
          </header>

          {loading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : patients.length === 0 ? (
            <div className="medical-card p-12 text-center">Aucun patient trouvé</div>
          ) : (
            <div className="grid gap-4">
              {patients.map((p) => (
                <div key={p.id} className="medical-card p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <div className="font-semibold">{p.first_name} {p.last_name}</div>
                    <div className="text-sm text-slate-600">Email: {p.email}</div>
                    <div className="text-sm text-slate-600">Inscrit le: {new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto">
                    <div>
                      <div className="text-xs text-slate-500">Téléphone</div>
                      <div className="font-medium">{p.info?.phone ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Âge / Sexe</div>
                      <div className="font-medium">{p.info?.age ?? '—'} • {p.info?.gender ?? '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => {
                        const token = localStorage.getItem('token');
                        if (!token) {
                          alert('Vous devez être connecté en tant que neurologue pour voir les informations.');
                          router.push('/login');
                          return;
                        }
                        // Open patient info modal by patient id
                        setModalPatientId(p.id);
                      }} variant="outline">Voir info patient</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <PatientInfoModal patientId={modalPatientId} open={!!modalPatientId} onClose={() => setModalPatientId(null)} />
    </div>
  );
}
