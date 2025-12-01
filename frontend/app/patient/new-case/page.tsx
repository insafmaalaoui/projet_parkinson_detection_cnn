"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FiHome, FiFileText, FiUser, FiLogOut } from "react-icons/fi";
import PatientSidebar from "@/components/PatientSidebar";
import { motion } from "framer-motion";

export default function NewCasePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
    const arr: string[] = [];
    if (e.target.files) {
      Array.from(e.target.files).forEach((f) => arr.push(URL.createObjectURL(f)));
    }
    setPreviews(arr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Vous devez être connecté en tant que patient pour créer un dossier");
        setUploading(false);
        router.push('/login');
        return;
      }
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.append("description", description);

      const res = await fetch("http://localhost:8000/cases/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        let msg = "Erreur lors du téléchargement";
        try {
          const body = await res.json();
          msg = body.detail || body.message || JSON.stringify(body);
        } catch (err) {}
        setError(msg);
        setUploading(false);
        return;
      }
      const data = await res.json();
      router.push(`/patient/case/${data.case_id}`);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PatientSidebar />

      {/* Main Content */}
      <main className="flex-1 p-10">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white shadow-lg rounded-xl p-8 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Nouveau Dossier Médical</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Images IRM</label>
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:bg-blue-50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  id="file-input"
                  className="w-full"
                />
                <div className="mt-4 text-sm text-slate-600">Formats supportés: JPEG, PNG, DICOM. Vous pouvez sélectionner plusieurs fichiers.</div>
              </div>
              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {previews.length > 0
                    ? previews.map((p, idx) => (
                        <div key={idx} className="border rounded p-2 text-center">
                          <img src={p} alt={`preview-${idx}`} className="mx-auto h-24 object-contain" />
                          <p className="text-xs text-slate-600 mt-2">{files[idx]?.name}</p>
                        </div>
                      ))
                    : files.map((file, idx) => (
                        <div key={idx} className="border rounded p-2 text-sm text-slate-600">{file.name}</div>
                      ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Description / Symptômes (optionnel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez vos symptômes et le contexte médical..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
            </div>

            {/* Buttons */}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={files.length === 0 || uploading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              >
                {uploading ? "Envoi en cours..." : "Soumettre"}
              </Button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
