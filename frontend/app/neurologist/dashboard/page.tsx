"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import NeurologistSidebar from "@/components/NeurologistSidebar";
import PatientInfoModal from "@/components/PatientInfoModal";
import DashboardHeader from "@/components/ui/DashboardHeader";
import StatCard from "@/components/ui/StatCard";

interface PatientCase {
  id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  created_at: string;
  // label like 'Malade' or 'Malade:0.9559'
  cnn_prediction: string | null;
  // numeric values (may be null)
  cnn_prediction_num?: number | null;
  cnn_confidence?: number | null;
  images_count: number;
}

export default function NeurologistDashboard() {
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [user, setUser] = useState<{ first_name?: string; last_name?: string } | null>(null);
  const [modalCaseId, setModalCaseId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchCases();
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("http://localhost:8000/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/neurologist/cases", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // sort by newest first
      data.sort((a: PatientCase, b: PatientCase) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCases(data);
    } catch (err) {
      console.error("Error fetching cases:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  };

  const getPriorityColor = (prediction: number | null) => {
    if (prediction === null || prediction === undefined) return "bg-slate-50 border-slate-100";
    if (prediction > 0.8) return "bg-red-50 border-red-200";
    if (prediction > 0.5) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  const parsePredictionString = (s?: string | null) => {
    if (!s) return null;
    const str = String(s).trim();
    if (str.includes(':')) {
      const part = str.split(':').pop();
      const v = Number(part);
      return Number.isFinite(v) ? v : null;
    }
    // no numeric part
    return null;
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search && !c.patient_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [cases, search, statusFilter]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NeurologistSidebar />

      <div className="flex-1">
        <main className="max-w-7xl mx-auto p-6">
          <DashboardHeader
            title={`Bonjour Dr. ${( `${user?.first_name ?? ''} ${user?.last_name ?? ''}`).trim() || 'Neurologue'}`}
            subtitle="Espace de révision des dossiers — priorisez vos analyses"
            avatarText={(user?.first_name ?? 'D')[0]}
            primaryLabel="Nouveau dossier"
            onPrimary={() => router.push('/neurologist/cases')}
          />
          <div className="flex items-center justify-between mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <StatCard title="Total Dossiers" value={cases.length} subtitle="Tous statuts" />
              <StatCard title="En attente" value={cases.filter(c=>c.status==='pending').length} subtitle="À analyser" gradient="bg-gradient-to-br from-yellow-400 to-yellow-600" />
              <StatCard title="Urgents" value={cases.filter(c=> (c.cnn_confidence ?? c.cnn_prediction_num ?? 0) > 0.8).length} subtitle="Confiance > 80%" gradient="bg-gradient-to-br from-red-400 to-red-600" />
            </div>
            <div className="text-sm text-slate-500 ml-6">{cases.length} total</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un patient..."
                  className="w-full sm:w-1/2 px-3 py-2 border rounded-md bg-white"
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-md bg-white">
                  <option value="all">Tous statuts</option>
                  <option value="pending">En attente</option>
                  <option value="reviewed">Analysé</option>
                  <option value="closed">Clos</option>
                </select>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="medical-card p-12 text-center">
                  <p className="text-slate-600">Aucun dossier correspondant</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className={`medical-card p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow cursor-pointer flex justify-between items-center ${getPriorityColor(
                        (caseItem.cnn_confidence ?? caseItem.cnn_prediction_num ?? parsePredictionString(caseItem.cnn_prediction)) ?? null
                      )}`}
                      onClick={() => router.push(`/neurologist/case/${caseItem.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-600 font-semibold shadow">
                          {getInitials(caseItem.patient_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-slate-900">{caseItem.patient_name}</p>
                          <p className="text-sm text-slate-500">Dossier #{caseItem.id.slice(0, 8)}</p>
                          <p className="text-sm text-slate-600 mt-1">{caseItem.images_count} image(s) • {new Date(caseItem.created_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        {/* Display label + numeric confidence when possible */}
                        <div className="text-sm text-slate-700">{caseItem.cnn_prediction ?? '—'}</div>
                        {((caseItem.cnn_confidence ?? caseItem.cnn_prediction_num ?? parsePredictionString(caseItem.cnn_prediction)) !== null) && (
                          <div className="text-2xl font-bold text-slate-900">{(((caseItem.cnn_confidence ?? caseItem.cnn_prediction_num ?? parsePredictionString(caseItem.cnn_prediction)) as number) * 100).toFixed(1)}%</div>
                        )}
                        <p className="text-xs text-slate-500 mt-2">Risque Parkinson</p>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalCaseId(caseItem.id);
                            }}
                            className="bg-slate-100 text-slate-700"
                          >
                            Info patient
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="medical-card p-4 bg-white">
                <h3 className="text-lg font-semibold">Conseil rapide</h3>
                <p className="text-sm text-slate-600 mt-2">Voir les dossiers les plus urgents et prioriser les analyses. Cliquez sur un dossier pour ouvrir sa page détaillée.</p>
              </div>

              <div className="medical-card p-4 bg-white">
                <h3 className="text-lg font-semibold">Filtres actifs</h3>
                <div className="text-sm text-slate-600 mt-2">Recherche: <span className="font-medium">{search || '—'}</span></div>
                <div className="text-sm text-slate-600">Statut: <span className="font-medium">{statusFilter}</span></div>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <PatientInfoModal caseId={modalCaseId} open={!!modalCaseId} onClose={() => setModalCaseId(null)} />
    </div>
  );
}
