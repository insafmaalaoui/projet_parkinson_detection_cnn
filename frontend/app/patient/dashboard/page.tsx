"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import PatientSidebar from "@/components/PatientSidebar";
import DashboardHeader from "@/components/ui/DashboardHeader";
import StatCard from "@/components/ui/StatCard";

interface Case {
  id: string;
  created_at: string;
  status: "pending" | "analyzed" | "completed";
  neurologist_report: string | null;
  cnn_prediction: number | null;
  images_count: number;
  report_pdf?: string | null;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "analyzed" | "completed">("all");
  const [user, setUser] = useState<{ first_name?: string; last_name?: string } | null>(null);
  
  // import sidebar component dynamically (client)
  

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    else fetchCases();
    fetchUser();
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
      console.error("fetchUser", err);
    }
  };

  const getPersonalTip = () => {
    // General advice about Parkinson's disease and lifestyle prevention
    const name = user?.first_name ? `${user.first_name}, ` : '';
    return (
      `${name}Voici des informations générales sur la maladie de Parkinson et des conseils de mode de vie pour réduire les risques :\n\n` +
      `• Symptômes fréquents : tremblements au repos, lenteur des mouvements (bradykinésie), rigidité, troubles de l'équilibre. En cas de symptômes persistants, consultez un neurologue.\n\n` +
      `• Mode de vie préventif : activité physique régulière (marche, vélo, renforcement musculaire), alimentation équilibrée riche en antioxydants, sommeil régulier, gestion du stress et évitement de toxines connues.\n\n` +
      `• Suivi médical : conservez vos examens, signalez tout changement progressif au médecin, et respectez les traitements prescrits.`
    );
  };

  const getInitials = () => {
    if (!user?.first_name) return 'U';
    return user.first_name[0].toUpperCase();
  };

  // Patients should not see model predictions; leave placeholder for neurologist-only view.

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/cases", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // token invalid or expired
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        router.push("/login");
        return;
      }
      const data = await res.json();
      setCases(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      analyzed: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      analyzed: "Analysé",
      completed: "Complété",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PatientSidebar />
      <div className="flex-1">
        <main className="max-w-7xl mx-auto p-6">
          {/* Hero / Header - modern professional style (matches neurologist dashboard) */}
          <DashboardHeader
            title={`Bonjour ${user?.first_name ?? 'Utilisateur'}${user?.last_name ? ` ${user.last_name}` : ''}`}
            subtitle="Gérez vos dossiers médicaux et accédez rapidement à vos rapports"
            avatarText={(user?.first_name ?? 'U')[0]}
            primaryLabel="Nouveau dossier"
            onPrimary={() => router.push('/patient/new-case')}
          />

          {/* Stats */}
          <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            <StatCard title="Total Dossiers" value={cases.length} subtitle="Tous statuts" />
            <StatCard title="En attente" value={cases.filter((c) => c.status === 'pending').length} gradient="bg-gradient-to-br from-yellow-400 to-yellow-600" />
            <StatCard title="Complétés" value={cases.filter((c) => c.status === 'completed').length} gradient="bg-gradient-to-br from-green-400 to-green-600" />
          </motion.div>

          {/* Filters + list */}
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-md ${filter==='all' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-white border'}`}>Tous</button>
              <button onClick={() => setFilter('pending')} className={`px-3 py-2 rounded-md ${filter==='pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-white border'}`}>En attente</button>
              <button onClick={() => setFilter('analyzed')} className={`px-3 py-2 rounded-md ${filter==='analyzed' ? 'bg-blue-100 text-blue-800' : 'bg-white border'}`}>Analysés</button>
              <button onClick={() => setFilter('completed')} className={`px-3 py-2 rounded-md ${filter==='completed' ? 'bg-green-100 text-green-800' : 'bg-white border'}`}>Complétés</button>
            </div>
            <div className="text-sm text-slate-500">{cases.length} dossier(s)</div>
          </div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
              </div>
            ) : cases.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-xl shadow-md">
                <img src="/images/illustration.png" alt="empty" className="mx-auto h-40 object-contain mb-6" />
                <p className="text-gray-600 mb-6">Vous n'avez pas encore de dossiers médicaux.</p>
                <Button onClick={() => router.push('/patient/new-case')} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Créer votre premier dossier</Button>
              </div>
            ) : (
              cases
                .filter((c) => (filter === 'all' ? true : c.status === filter))
                .map((caseItem: Case) => (
                  <motion.div key={caseItem.id} className="bg-white rounded-xl shadow hover:shadow-2xl overflow-hidden" whileHover={{ y: -6 }}>
                    <div className="flex">
                      <div className="w-12 flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 text-white flex items-center justify-center font-semibold">{getInitials()}</div>
                      </div>
                      <div className="p-4 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-slate-400">Créé le {new Date(caseItem.created_at).toLocaleDateString('fr-FR')}</p>
                            <h3 className="font-semibold text-slate-900">Dossier #{caseItem.id.slice(0,8)}</h3>
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{caseItem.neurologist_report ?? 'Aucun rapport pour le moment'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            {getStatusBadge(caseItem.status)}
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => router.push(`/patient/case/${caseItem.id}`)}>Voir</Button>
                              <Button size="sm" onClick={() => alert('Partager fonctionnalité à implémenter')} className="bg-slate-100">Partager</Button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          {caseItem.report_pdf ? (
                            <a href={`http://localhost:8000${caseItem.report_pdf}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">Télécharger le rapport (PDF)</a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
            )}
          </motion.div>

          {/* Conseil personnalisé */}
          <div className="mt-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Conseil pour toi</h3>
                <p className="text-slate-600 mt-2 whitespace-pre-line">{getPersonalTip()}</p>
                <div className="mt-3 flex items-center gap-3">
                  <a href="/contact" className="text-sm text-slate-500 underline">Contacter</a>
                </div>
              </div>
            </div>
          </div>

          {/* No per-case modal; advice is shown inline above. */}
        </main>
      </div>
    </div>
  );
}
