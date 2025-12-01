"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  caseId?: string | null;
  patientId?: string | null;
  open: boolean;
  onClose: () => void;
}

export default function PatientInfoModal({ caseId, patientId, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any | null>(null);

  const _computeAge = (dob: any) => {
    if (!dob) return null;
    try {
      let dt = null;
      if (typeof dob === "string") {
        dt = new Date(dob);
        if (isNaN(dt.getTime())) {
          const m1 = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          const m2 = dob.match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (m1) dt = new Date(`${m1[3]}-${m1[2]}-${m1[1]}`);
          else if (m2) dt = new Date(`${m2[3]}-${m2[2]}-${m2[1]}`);
        }
      } else if (dob instanceof Date) {
        dt = dob;
      }
      if (!dt || isNaN(dt.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - dt.getFullYear();
      const m = today.getMonth() - dt.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dt.getDate())) age--;
      return age;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (!open) return;
    const idToUse = patientId || caseId;
    if (!idToUse) return;

    setLoading(true);
    const token = localStorage.getItem("token");
    const url = patientId
      ? `http://localhost:8000/neurologist/patient/${patientId}`
      : `http://localhost:8000/neurologist/case/${caseId}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data?.info) setInfo(data.info);
        else if (data?.patient_info) setInfo(data.patient_info);
        else setInfo(null);
      })
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [open, caseId, patientId]);

  if (!open) return null;

  const fullName = `${info?.first_name || ""} ${info?.last_name || ""}`.trim();
  const avatarInitial = info?.first_name ? String(info.first_name)[0].toUpperCase() : "U";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-11/12 md:w-3/4 lg:w-1/2 shadow-lg overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-gradient-to-r from-sky-500 to-indigo-600 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              {avatarInitial}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {fullName || "Informations Patient"}
              </h3>
              <div className="text-sm opacity-90">Détails cliniques et contact</div>
            </div>
          </div>
          <Button onClick={onClose} className="bg-white/20 text-white">
            Fermer
          </Button>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">Chargement...</div>
          ) : !info ? (
            <div className="text-center py-8 text-slate-600">Aucune information disponible</div>
          ) : (
            <div className="space-y-4">

              {/* SECTION 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Nom complet</p>
                  <p className="font-medium">{fullName || "—"}</p>

                  <p className="text-sm text-slate-500 mt-3">Date de naissance</p>
                  <p className="font-medium">{info.date_of_birth || "—"}</p>

                  <p className="text-sm text-slate-500 mt-3">Âge</p>
                  <p className="font-medium">
                    {info.age ?? _computeAge(info.date_of_birth) ?? "—"}
                  </p>

                  <p className="text-sm text-slate-500 mt-3">Sexe</p>
                  <p className="font-medium">{info.gender || "—"}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Contact</p>
                  <p className="font-medium">Téléphone: {info.phone || "—"}</p>
                  <p className="font-medium">Adresse: {info.address || "—"}</p>
                  <p className="font-medium">
                    Contact d'urgence: {info.emergency_contact || "—"}
                  </p>

                  <p className="text-sm text-slate-500 mt-3">Mesures</p>
                  <p className="font-medium">
                    Taille: {info.height_cm ? `${info.height_cm} cm` : "—"}
                  </p>
                  <p className="font-medium">
                    Poids: {info.weight_kg ? `${info.weight_kg} kg` : "—"}
                  </p>
                </div>
              </div>

              {/* SECTION 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Antécédents médicaux</p>
                  <p className="font-medium">{info.medical_history || "—"}</p>

                  <p className="text-sm text-slate-500 mt-3">Autres maladies</p>
                  <p className="font-medium">
                    {info.autres_maladies === null || info.autres_maladies === undefined
                      ? "—"
                      : info.autres_maladies
                      ? "Oui"
                      : "Non"}
                  </p>

                  <p className="text-sm text-slate-500 mt-3">Détails autres maladies</p>
                  <p className="font-medium">{info.details_autres_maladies || "—"}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Observations</p>
                  <p className="font-medium">{info.observations || "—"}</p>

                  <p className="text-sm text-slate-500 mt-3">Timestamps</p>
                  <p className="font-medium">
                    Créé: {info.created_at ? new Date(info.created_at).toLocaleString() : "—"}
                  </p>
                  <p className="font-medium">
                    Mis à jour: {info.updated_at ? new Date(info.updated_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              {/* SYMPTÔMES MOTEURS */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Symptômes moteurs</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ["Tremblements", "tremblements"],
                    ["Rigidité", "rigidite"],
                    ["Bradykinésie", "bradykinesie"],
                    ["Difficulté de marche", "difficulte_marche"],
                    ["Instabilité", "instabilite"],
                    ["Expression faciale réduite", "expression_faciale_reduite"],
                    ["Micrographie", "micrographie"],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className="font-medium">
                        {info[key] === null || info[key] === undefined
                          ? "—"
                          : info[key]
                          ? "Oui"
                          : "Non"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SYMPTÔMES NON-MOTEURS */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Symptômes non-moteurs</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ["Fatigue", "fatigue"],
                    ["Troubles du sommeil", "troubles_sommeil"],
                    ["Troubles cognitifs", "troubles_cognitifs"],
                    ["Dépression / Anxiété", "depression_anxiete"],
                    ["Perte d'odorat", "perte_odorat"],
                    ["Constipation", "constipation"],
                    ["Problèmes urinaires", "problemes_urinaires"],
                    ["Douleurs", "douleurs"],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className="font-medium">
                        {info[key] === null || info[key] === undefined
                          ? "—"
                          : info[key]
                          ? "Oui"
                          : "Non"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
