"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaFacebookF, FaTwitter, FaLinkedinIn } from "react-icons/fa";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"patient" | "neurologist" | "admin">("patient");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      if (!res.ok) {
        throw new Error("Identifiants invalides");
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", role);

      if (role === "patient") router.push("/patient/dashboard");
      else if (role === "neurologist") router.push("/neurologist/dashboard");
      else router.push("/admin/dashboard");
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
            <p className="text-slate-600 mt-2 text-sm">Connectez-vous à votre compte</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="patient">Patient</option>
                <option value="neurologist">Neurologue</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg py-3 rounded-lg font-semibold"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="text-center text-slate-600 mt-6 text-sm">
            Pas de compte?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-semibold">
              S'inscrire
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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">MD</div>
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
