"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import PatientSidebar from "@/components/PatientSidebar";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [info, setInfo] = useState({
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    height_cm: "",
    weight_kg: "",
    medical_history: "",
    emergency_contact: "",
    autres_maladies: false,
    details_autres_maladies: "",
    tremblements: false,
    rigidite: false,
    bradykinesie: false,
    difficulte_marche: false,
    instabilite: false,
    expression_faciale_reduite: false,
    micrographie: false,
    fatigue: false,
    troubles_sommeil: false,
    troubles_cognitifs: false,
    depression_anxiete: false,
    perte_odorat: false,
    constipation: false,
    problemes_urinaires: false,
    douleurs: false,
    observations: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const localRole = localStorage.getItem("role");
    if (localRole !== "patient") {
      setError("Accès réservé aux patients — connectez-vous en tant que patient.");
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/patients/info", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Impossible de récupérer le profil");
        }

        const data = await res.json();
        if (data.info) {
          setInfo({
            phone: data.info.phone || "",
            date_of_birth: data.info.date_of_birth || "",
            gender: data.info.gender || "",
            address: data.info.address || "",
            height_cm: data.info.height_cm ? String(data.info.height_cm) : "",
            weight_kg: data.info.weight_kg ? String(data.info.weight_kg) : "",
            medical_history: data.info.medical_history || "",
            emergency_contact: data.info.emergency_contact || "",
            autres_maladies: !!data.info.autres_maladies,
            details_autres_maladies: data.info.details_autres_maladies || "",
            tremblements: !!data.info.tremblements,
            rigidite: !!data.info.rigidite,
            bradykinesie: !!data.info.bradykinesie,
            difficulte_marche: !!data.info.difficulte_marche,
            instabilite: !!data.info.instabilite,
            expression_faciale_reduite: !!data.info.expression_faciale_reduite,
            micrographie: !!data.info.micrographie,
            fatigue: !!data.info.fatigue,
            troubles_sommeil: !!data.info.troubles_sommeil,
            troubles_cognitifs: !!data.info.troubles_cognitifs,
            depression_anxiete: !!data.info.depression_anxiete,
            perte_odorat: !!data.info.perte_odorat,
            constipation: !!data.info.constipation,
            problemes_urinaires: !!data.info.problemes_urinaires,
            douleurs: !!data.info.douleurs,
            observations: data.info.observations || "",
          });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setInfo((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const payload = {
        phone: info.phone || null,
        date_of_birth: info.date_of_birth || null,
        gender: info.gender || null,
        address: info.address || null,
        height_cm: info.height_cm ? Number(info.height_cm) : null,
        weight_kg: info.weight_kg ? Number(info.weight_kg) : null,
        medical_history: info.medical_history || null,
        emergency_contact: info.emergency_contact || null,
        autres_maladies: info.autres_maladies || false,
        details_autres_maladies: info.details_autres_maladies || null,
        tremblements: info.tremblements || false,
        rigidite: info.rigidite || false,
        bradykinesie: info.bradykinesie || false,
        difficulte_marche: info.difficulte_marche || false,
        instabilite: info.instabilite || false,
        expression_faciale_reduite: info.expression_faciale_reduite || false,
        micrographie: info.micrographie || false,
        fatigue: info.fatigue || false,
        troubles_sommeil: info.troubles_sommeil || false,
        troubles_cognitifs: info.troubles_cognitifs || false,
        depression_anxiete: info.depression_anxiete || false,
        perte_odorat: info.perte_odorat || false,
        constipation: info.constipation || false,
        problemes_urinaires: info.problemes_urinaires || false,
        douleurs: info.douleurs || false,
        observations: info.observations || null,
      };

      const res = await fetch("http://localhost:8000/patients/info", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Try to parse server error message
        let msg = "Impossible de sauvegarder les informations";
        try {
          const body = await res.json();
          msg = body.detail || body.message || JSON.stringify(body);
        } catch (err) {
          // ignore parse errors
        }
        setError(msg);
        return;
      }

      // Read response (optional)
      // const data = await res.json();
      router.push("/patient/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PatientSidebar />
      <main className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-8 mx-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>
              <p className="text-sm text-slate-600 mt-1">Mettez à jour vos informations personnelles</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                <input name="phone" value={info.phone} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date de naissance</label>
                <input name="date_of_birth" type="date" value={info.date_of_birth} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Genre</label>
                <select name="gender" value={info.gender} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="">-- Choisir --</option>
                  <option value="female">Femme</option>
                  <option value="male">Homme</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contact d'urgence</label>
                <input name="emergency_contact" value={info.emergency_contact} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
              <input name="address" value={info.address} onChange={handleChange} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Taille (cm)</label>
                <input name="height_cm" value={info.height_cm} onChange={handleChange} type="number" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Poids (kg)</label>
                <input name="weight_kg" value={info.weight_kg} onChange={handleChange} type="number" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Antécédents médicaux</label>
              <textarea name="medical_history" value={info.medical_history} onChange={handleChange} rows={4} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>

            {/* Motor / Non-motor symptoms and observations */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">Symptômes moteurs</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 mb-4">
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="tremblements" checked={info.tremblements} onChange={handleCheckbox} /> Tremblements</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="rigidite" checked={info.rigidite} onChange={handleCheckbox} /> Rigidité</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="bradykinesie" checked={info.bradykinesie} onChange={handleCheckbox} /> Bradykinésie</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="difficulte_marche" checked={info.difficulte_marche} onChange={handleCheckbox} /> Difficulté à marcher</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="instabilite" checked={info.instabilite} onChange={handleCheckbox} /> Instabilité</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="expression_faciale_reduite" checked={info.expression_faciale_reduite} onChange={handleCheckbox} /> Expression faciale réduite</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="micrographie" checked={info.micrographie} onChange={handleCheckbox} /> Micrographie</label>
              </div>

              <h3 className="text-lg font-semibold mb-2">Symptômes non-moteurs</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 mb-4">
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="fatigue" checked={info.fatigue} onChange={handleCheckbox} /> Fatigue</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="troubles_sommeil" checked={info.troubles_sommeil} onChange={handleCheckbox} /> Troubles du sommeil</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="troubles_cognitifs" checked={info.troubles_cognitifs} onChange={handleCheckbox} /> Troubles cognitifs</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="depression_anxiete" checked={info.depression_anxiete} onChange={handleCheckbox} /> Dépression / Anxiété</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="perte_odorat" checked={info.perte_odorat} onChange={handleCheckbox} /> Perte d'odorat</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="constipation" checked={info.constipation} onChange={handleCheckbox} /> Constipation</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="problemes_urinaires" checked={info.problemes_urinaires} onChange={handleCheckbox} /> Problèmes urinaires</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="douleurs" checked={info.douleurs} onChange={handleCheckbox} /> Douleurs</label>
              </div>

              <div className="mb-4">
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="autres_maladies" checked={info.autres_maladies} onChange={handleCheckbox} /> J'ai d'autres maladies</label>
                {info.autres_maladies && (
                  <input name="details_autres_maladies" value={info.details_autres_maladies} onChange={handleChange} placeholder="Détails" className="w-full mt-2 px-3 py-2 border rounded" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Observations</label>
                <textarea name="observations" value={info.observations} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
              </Button>
              <Button type="button" onClick={() => router.push('/patient/dashboard')} className="bg-slate-100 text-slate-700">
                Annuler
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
