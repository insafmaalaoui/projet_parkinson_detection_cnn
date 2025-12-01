"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaFacebookF, FaTwitter, FaLinkedinIn } from "react-icons/fa";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") || "patient") as "patient" | "neurologist" | "admin";
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    speciality: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: role,
          first_name: formData.firstName,
          last_name: formData.lastName,
          speciality: formData.speciality || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'inscription");
      }

      router.push("/login");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="w-full z-50 bg-gradient-to-r from-blue-600/95 to-blue-700/95 backdrop-blur-lg shadow-2xl border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div className="flex items-center gap-3 cursor-pointer" whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <div className="w-10 h-10 bg-gradient-to-br from-white to-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg shadow">
              MD
            </div>
            <div>
              <span className="font-bold text-lg text-white block">MediDiagnose</span>
            </div>
          </motion.div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-blue-50">
            <a href="/" className="hover:text-white transition">Accueil</a>
            <a href="/register" className="hover:text-white transition">Inscription</a>
            <a href="/login" className="hover:text-white transition">Connexion</a>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 mx-auto"
        >
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-4 shadow-lg">
            MD
          </div>
          <h1 className="text-3xl font-black text-slate-900">MediDiagnose</h1>
          <p className="text-slate-600 mt-2 text-sm">
            {role === "patient" && "Créez votre compte patient"}
            {role === "neurologist" && "Inscrivez-vous en tant que neurologue"}
            {role === "admin" && "Inscription administrateur"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="firstName"
              placeholder="Prénom"
              value={formData.firstName}
              onChange={handleChange}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
            <input
              type="text"
              name="lastName"
              placeholder="Nom"
              value={formData.lastName}
              onChange={handleChange}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />

          {role === "neurologist" && (
            <input
              type="text"
              name="speciality"
              placeholder="Spécialité (ex: Neurologie générale)"
              value={formData.speciality}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          )}

          <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirmer le mot de passe"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg py-3 rounded-lg font-semibold"
          >
            {loading ? "Inscription..." : "S'inscrire"}
          </Button>
        </form>

        <p className="text-center text-slate-600 mt-6 text-sm">
          Vous avez un compte?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-semibold">
            Connectez-vous
          </Link>
        </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-black text-white py-10 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  MD
                </div>
                <span className="font-bold text-lg">MediDiagnose</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Plateforme collaborative pour le diagnostic et le suivi des maladies neurodégénératives.</p>
            </div>
            <div>
              <h3 className="font-bold mb-3">Navigation</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="/" className="hover:text-white transition">Accueil</a></li>
                <li><a href="/register" className="hover:text-white transition">Inscription</a></li>
                <li><a href="/login" className="hover:text-white transition">Connexion</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3">Suivez-nous</h3>
              <div className="flex gap-4 text-slate-400">
                <FaFacebookF size={20} className="hover:text-blue-400 transition cursor-pointer" />
                <FaTwitter size={20} className="hover:text-blue-300 transition cursor-pointer" />
                <FaLinkedinIn size={20} className="hover:text-blue-400 transition cursor-pointer" />
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-4 text-center text-slate-400 text-sm">
            <p>&copy; 2025 MediDiagnose. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
