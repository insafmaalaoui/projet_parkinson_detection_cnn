"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import NeurologistSidebar from "@/components/NeurologistSidebar";
import UploadPreview from '@/components/UploadPreview'
import ChatbotShortcut from "@/components/ChatbotShortcut";

interface CaseDetail {
  id: string;
  patient_name: string;
  description: string;
  status: string;
  // label like 'Malade' or legacy 'Malade:0.9559'
  cnn_prediction: string | null;
  // numeric confidence (0.0-1.0) when available
  cnn_confidence?: number | null;
  images: Array<{ id: string; url: string }>;
}

export default function NeurologistCasePage() {
  const params = useParams();
  const caseId = params.id as string;
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ first_name?: string; last_name?: string } | null>(null);
  const [report, setReport] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [examFindings, setExamFindings] = useState("");
  const [updrsScore, setUpdrsScore] = useState("");
  const [complementaryExams, setComplementaryExams] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCaseDetail();
  }, [caseId]);

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCaseDetail = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert('Non connecté. Veuillez vous connecter en tant que neurologue.');
        router.push('/login');
        return;
      }

      const res = await fetch(`http://localhost:8000/neurologist/case/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // try to show backend message
        try {
          const payload = await res.json();
          if (payload && payload.detail) {
            alert(payload.detail);
            if (res.status === 401 || res.status === 403) router.push('/login');
            return;
          }
        } catch (e) {
          // fallback
        }
        alert('Erreur lors de la récupération du dossier');
        return;
      }

      const data = await res.json();
      setCaseDetail(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const parsePredictionNumber = (s?: string | null) => {
    if (!s) return null;
    const str = String(s).trim();
    if (str.includes(':')) {
      const part = str.split(':').pop();
      const v = Number(part);
      return Number.isFinite(v) ? v : null;
    }
    return null;
  };

  const getPredictionLabel = (raw?: string | null) => {
    if (!raw) return null;
    return raw.includes(':') ? raw.split(':')[0] : raw;
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: chatInput },
    ]);
    setChatInput("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          case_id: caseId,
          message: chatInput,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
    }
  };

  const handleSubmitReport = async () => {
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8000/neurologist/case/${caseId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          neurologist_report: report,
          // send numeric confirmed_prediction (confidence) when possible
          confirmed_prediction: (caseDetail?.cnn_confidence ?? parsePredictionNumber(caseDetail?.cnn_prediction)) ?? null,
        }),
      });
      if (res.ok) {
        alert("Rapport soumis avec succès");
        router.push("/neurologist/dashboard");
      } else {
        // show validation error details when available
        let errText = "Erreur lors de la soumission";
        try {
          const payload = await res.json();
          if (payload && payload.detail) errText = JSON.stringify(payload.detail, null, 2);
        } catch (e) {}
        alert(errText);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Erreur lors de la soumission");
    } finally {
      setSubmitLoading(false);
    }
  };

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

  if (loading) return <div className="text-center py-12">Chargement...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <NeurologistSidebar />

      <div className="flex-1">
        <main className="max-w-7xl mx-auto p-6">
          <header className="medical-header py-6 border-b border-blue-700 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => router.back()}
                  variant="outline"
                  className="bg-white text-blue-600"
                >
                  ←
                </Button>
                <div className="ml-2">
                  <div className="text-sm text-blue-100">Bonjour Dr. {( `${user?.first_name ?? ''} ${user?.last_name ?? ''}`).trim() || 'Neurologue'}</div>
                  <h1 className="text-2xl font-bold text-white">Analyse - {caseDetail?.patient_name}</h1>
                </div>
              </div>
            </div>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Images */}
            <div className="md:col-span-2">
              <div className="medical-card p-8 mb-8">
                <h3 className="text-lg font-semibold mb-10">Images IRM</h3>
                <div className="grid grid-cols-2 gap-4">
                  {caseDetail?.images.map((img) => (
                    <div key={img.id} className="bg-slate-100 rounded-lg overflow-hidden h-68">
                      <UploadPreview src={img.url || '/placeholder.svg'} alt={`Image ${img.id}`} className="w-full h-48 rounded-lg overflow-hidden" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="medical-card p-6">
                <h3 className="text-lg font-semibold mb-4">CNN Prédiction</h3>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 mb-2">
                    {/* Show label and confidence: e.g. "Patient malade avec confiance 0.97" */}
                    {(() => {
                      if (!caseDetail) return "—";
                      const raw = caseDetail.cnn_prediction;
                      const label = getPredictionLabel(raw) || 'Non évalué';
                      const conf = (caseDetail.cnn_confidence ?? parsePredictionNumber(raw));
                      if (conf !== null && conf !== undefined) {
                        return `Patient ${label.toLowerCase()} avec confiance ${conf.toFixed(2)}`;
                      }
                      return `Patient ${label.toLowerCase()}`;
                    })()}
                  </p>
                  <p className="text-slate-700">Risque de Maladie de Parkinson</p>
                </div>
              </div>
            </div>

            {/* Chatbot & Rapport */}
            <div className="md:col-span-1">


              <div className="medical-card p-6">
                  <Button
                    onClick={() => router.push("/chatbot")}
                    className="w-full bg-blue-300 hover:bg-blue-700"
  >
                      S’aider par un assistant
                  </Button>
                <h3 className="text-lg font-semibold mb-4">Rapport Médical structuré</h3>
                
                <label className="text-sm font-medium">Résumé clinique</label>
                <textarea
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  placeholder="Résumé des observations cliniques, examen, signes pertinents..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                  rows={4}
                />

                <label className="text-sm font-medium">Conclusion / Diagnostic</label>
                <input
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Conclusion ou diagnostic principal"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <label className="text-sm font-medium">Examen clinique (constatations)</label>
                <textarea
                  value={examFindings}
                  onChange={(e) => setExamFindings(e.target.value)}
                  placeholder="Trouvailles de l'examen neurologique"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                  rows={3}
                />

                <label className="text-sm font-medium">Score UPDRS (si disponible)</label>
                <input
                  value={updrsScore}
                  onChange={(e) => setUpdrsScore(e.target.value)}
                  placeholder="Ex: 23"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <label className="text-sm font-medium">Examens complémentaires recommandés</label>
                <input
                  value={complementaryExams}
                  onChange={(e) => setComplementaryExams(e.target.value)}
                  placeholder="IRM, DAT-scan, bilan biologique..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                />

                <label className="text-sm font-medium">Recommandations</label>
                <textarea
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Recommandations, examens complémentaires, suivi..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
                  rows={4}
                />

                <label className="text-sm font-medium">Plan de suivi</label>
                <textarea
                  value={followUpPlan}
                  onChange={(e) => setFollowUpPlan(e.target.value)}
                  placeholder="Fréquence de suivi, objectifs thérapeutiques..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
                  rows={3}
                />

                <label className="text-sm font-medium">Notes complémentaires</label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Informations additionnelles"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
                  rows={2}
                />

                <Button
                  onClick={() => {
                    // build the free-text report from structured fields
                    const combined = `Résumé clinique:\n${clinicalSummary.trim()}\n\nExamen clinique:\n${examFindings.trim()}\n\nScore UPDRS:\n${updrsScore.trim()}\n\nConclusion:\n${conclusion.trim()}\n\nExamens complémentaires:\n${complementaryExams.trim()}\n\nRecommandations:\n${recommendations.trim()}\n\nPlan de suivi:\n${followUpPlan.trim()}\n\nNotes complémentaires:\n${additionalNotes.trim()}`;
                    setReport(combined);
                    // call submit handler which uses `report` variable; pass combined directly by temporarily setting
                    // to avoid race conditions, call the fetch directly here
                    (async () => {
                      setSubmitLoading(true);
                      try {
                        const token = localStorage.getItem("token");
                        const res = await fetch(`http://localhost:8000/neurologist/case/${caseId}/report`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                              clinical_summary: clinicalSummary,
                              exam_findings: examFindings,
                              updrs_score: updrsScore,
                              diagnosis: conclusion,
                              recommendations: recommendations,
                              complementary_exams: complementaryExams,
                              follow_up_plan: followUpPlan,
                              additional_notes: additionalNotes,
                              neurologist_report: combined,
                              confirmed_prediction: (caseDetail?.cnn_confidence ?? parsePredictionNumber(caseDetail?.cnn_prediction)) ?? null,
                          }),
                        });
                        if (res.ok) {
                          alert("Rapport soumis avec succès");
                          router.push("/neurologist/dashboard");
                        } else {
                          let errText = "Erreur lors de la soumission";
                          try {
                            const payload = await res.json();
                            if (payload && payload.detail) errText = JSON.stringify(payload.detail, null, 2);
                          } catch (e) {}
                          alert(errText);
                        }
                      } catch (err) {
                        console.error("Error:", err);
                        alert("Erreur lors de la soumission");
                      } finally {
                        setSubmitLoading(false);
                      }
                    })();
                  }}
                  disabled={submitLoading || (!clinicalSummary && !conclusion && !recommendations)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {submitLoading ? "Envoi..." : "Générer et Soumettre le PDF"}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
