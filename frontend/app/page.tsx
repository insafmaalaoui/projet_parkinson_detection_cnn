"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FaFacebookF, FaTwitter, FaLinkedinIn } from "react-icons/fa";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      {/* Header */}
      <header className="fixed w-full z-50 bg-gradient-to-r from-blue-600/95 to-blue-700/95 backdrop-blur-lg shadow-2xl border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-white to-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl shadow-lg">
              MD
            </div>
            <div>
              <span className="font-bold text-xl text-white block">MediDiagnose</span>
              <span className="text-xs text-blue-100">Diagnostic Intelligent</span>
            </div>
          </motion.div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-blue-50">
            <a href="#features" className="hover:text-white transition duration-300 relative group">
              Caractéristiques
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#diseases" className="hover:text-white transition duration-300 relative group">
              Maladies
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#testimonials" className="hover:text-white transition duration-300 relative group">
              Témoignages
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#about" className="hover:text-white transition duration-300 relative group">
              À propos
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
            </a>
          </nav>
          <div className="hidden md:flex gap-3">
            <Link href="/login"><Button variant="outline" className="border-white text-white hover:bg-white/10">Connexion</Button></Link>
            <Link href="/register"><Button className="bg-white text-blue-600 hover:bg-blue-50">Inscription</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0">
          <img src="/images/parkinson.png" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
        <div className="relative z-10 text-center px-6 md:px-0 max-w-4xl">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-6 inline-block px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20"
          >
            <span className="text-white/90 text-sm font-medium">🚀 Plateforme IA Avancée</span>
          </motion.div>
          <motion.h1
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight"
          >
            Diagnostic Intelligent du <span className="text-white font-extrabold">Parkinson</span>
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-xl md:text-2xl text-white/80 mb-10 leading-relaxed max-w-2xl mx-auto"
          >
            Plateforme collaborative pour un diagnostic précis et un suivi personnalisé basé sur l'intelligence artificielle
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col md:flex-row gap-4 justify-center"
          >
            <Link href="/register?role=patient">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 shadow-2xl font-bold px-8 py-6 text-lg">
                👤 Patient - Commencer
              </Button>
            </Link>
            <Link href="/register?role=neurologist">
              <Button size="lg" className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-2xl font-bold px-8 py-6 text-lg">
                👨‍⚕️ Neurologue - S'inscrire
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-black text-slate-900 mb-4">Nos Caractéristiques</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
          <p className="text-slate-600 mt-6 text-lg max-w-2xl mx-auto">Des outils puissants pour améliorer votre diagnostic et suivi médical</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "🔬", title: "Analyse IRM Avancée", desc: "Téléchargez vos images IRM et recevez une analyse basée sur CNN avec précision diagnostique" },
            { icon: "👨‍⚕️", title: "Suivi Neurologue", desc: "Collaboration en temps réel avec des spécialistes certifiés pour un suivi personnalisé" },
            { icon: "💬", title: "Chatbot Intelligent", desc: "Assistance contextuelle 24/7 pour les médecins et patients avec réponses en temps réel" },
          ].map((feat, idx) => (
            <motion.div
              key={idx}
              className="group relative bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-8 text-center hover:shadow-2xl transition-all duration-300 border border-blue-100 overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.6 }}
              whileHover={{ y: -10, scale: 1.02 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">{feat.icon}</div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900">{feat.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Maladies Section */}
      <section id="diseases" className="max-w-7xl mx-auto px-6 py-32 mt-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-black text-slate-900 mb-4">Maladies Neurodégénératives</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
          <p className="text-slate-600 mt-6 text-lg max-w-2xl mx-auto">Diagnostic et suivi des maladies complexes du système nerveux</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "🧠", name: "Parkinson", desc: "Trouble du mouvement causé par la perte progressive des neurones producteurs de dopamine. Détection précoce et suivi continu." },
            { icon: "🧩", name: "Alzheimer", desc: "Perte de mémoire progressive et troubles cognitifs affectant la qualité de vie. Intervention thérapeutique optimisée." },
            { icon: "⚡", name: "Sclérose en plaques", desc: "Maladie auto-immune affectant le système nerveux central. Gestion personnalisée du traitement." },
          ].map((disease, idx) => (
            <motion.div
              key={idx}
              className="relative group bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-2xl text-center hover:shadow-2xl transition-all duration-300 overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.6 }}
              whileHover={{ y: -10 }}
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-xl group-hover:backdrop-blur-none transition-all duration-300"></div>
              <div className="relative z-10">
                <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">{disease.icon}</div>
                <h3 className="text-2xl font-bold mb-3 text-white">{disease.name}</h3>
                <p className="text-blue-50 leading-relaxed">{disease.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="max-w-7xl mx-auto px-6 py-32 mt-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-black text-slate-900 mb-4">Témoignages de Nos Utilisateurs</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
          <p className="text-slate-600 mt-6 text-lg max-w-2xl mx-auto">Découvrez comment MediDiagnose aide patients et médecins</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: "Alice", role: "Patient", text: "Grâce à MediDiagnose, j'ai pu suivre mon traitement et obtenir un diagnostic précis rapidement. La plateforme est intuitive et rassurante." },
            { name: "Dr. Bernard", role: "Neurologue", text: "La plateforme est intuitive et facilite grandement la communication avec mes patients. Les outils d'analyse sont précis et efficaces." },
            { name: "Sophie", role: "Patient", text: "Le chatbot m'aide à comprendre mes symptômes avant de consulter le médecin. C'est un excellent premier pas dans mon parcours médical." },
          ].map((t, idx) => (
            <motion.div
              key={idx}
              className="group relative bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-blue-300 overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.6 }}
              whileHover={{ y: -8 }}
            >
              <div className="absolute top-0 left-0 w-1 h-12 bg-gradient-to-b from-blue-600 to-transparent group-hover:h-full transition-all duration-500"></div>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-lg">★</span>)}
              </div>
              <p className="text-slate-700 mb-6 leading-relaxed italic">&quot;{t.text}&quot;</p>
              <div className="border-t pt-4">
                <h3 className="font-bold text-slate-900">{t.name}</h3>
                <p className="text-sm text-blue-600 font-medium">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
{/* About Section */}
<section id="about" className="max-w-7xl mx-auto px-6 py-32 mt-12">
  <div className="md:flex md:items-center md:gap-16">
    {/* Image / illustration */}
    <motion.div
      className="md:w-1/2 mb-10 md:mb-0"
      initial={{ x: -80, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-30"></div>
        <img
          src="/images/illustration.png"
          alt="À propos de MediDiagnose"
          className="relative w-full h-auto rounded-3xl shadow-2xl border-4 border-white"
        />
      </div>
    </motion.div>

    {/* Texte */}
    <motion.div
      className="md:w-1/2"
      initial={{ x: 80, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="inline-block px-4 py-2 bg-blue-100 rounded-full mb-4">
        <span className="text-blue-700 text-sm font-bold">✨ À PROPOS</span>
      </div>
      <h2 className="text-5xl font-black text-slate-900 mb-8 leading-tight">À propos de <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">MediDiagnose</span></h2>
      <div className="space-y-6">
        <p className="text-lg text-slate-700 leading-relaxed">
          MediDiagnose est une plateforme innovante dédiée à l'analyse et au suivi des maladies neurodégénératives. 
          Nous réunissons neurologues et patients pour offrir un diagnostic précis et un accompagnement personnalisé grâce à l'intelligence artificielle.
        </p>
        <p className="text-lg text-slate-700 leading-relaxed">
          Notre mission est de faciliter la détection précoce, améliorer la communication entre patients et médecins, et rendre le suivi médical plus efficace et accessible à tous.
        </p>
        <div className="pt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">✓</div>
            <div>
              <p className="font-semibold text-slate-900">Technologie IA</p>
              <p className="text-sm text-slate-600">Analyse précise</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold">✓</div>
            <div>
              <p className="font-semibold text-slate-900">Experts</p>
              <p className="text-sm text-slate-600">Neurologues</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  </div>
</section>

      {/* CTA Section */}
      <section className="max-w-5xl mx-auto px-6 py-32">
        <motion.div
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 md:p-20 text-center text-white shadow-2xl"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-black mb-6">Prêt à commencer votre voyage?</h2>
          <p className="text-xl text-blue-50 mb-10 max-w-2xl mx-auto leading-relaxed">Rejoignez des milliers d'utilisateurs qui font confiance à MediDiagnose pour leur diagnostic et suivi médical</p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link href="/register?role=patient">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl font-bold px-8 py-6 text-lg">
                Commencer en tant que Patient
              </Button>
            </Link>
            <Link href="/register?role=neurologist">
              <Button size="lg" className="bg-white/20 backdrop-blur-md border border-white/50 text-white hover:bg-white/30 shadow-xl font-bold px-8 py-6 text-lg">
                S'inscrire en tant que Neurologue
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-black text-white py-16 mt-24 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  MD
                </div>
                <span className="font-bold text-lg">MediDiagnose</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">Plateforme collaborative pour le diagnostic des maladies neurodégénératives</p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Navigation</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-white transition">Caractéristiques</a></li>
                <li><a href="#diseases" className="hover:text-white transition">Maladies</a></li>
                <li><a href="#testimonials" className="hover:text-white transition">Témoignages</a></li>
                <li><a href="#about" className="hover:text-white transition">À propos</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Utilisateurs</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/login" className="hover:text-white transition">Connexion</Link></li>
                <li><Link href="/register" className="hover:text-white transition">S'inscrire</Link></li>
                <li><a href="#" className="hover:text-white transition">Oublié mon mot de passe</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Suivez-nous</h3>
              <div className="flex gap-4 text-slate-400">
                <FaFacebookF size={20} className="hover:text-blue-400 transition cursor-pointer" />
                <FaTwitter size={20} className="hover:text-blue-300 transition cursor-pointer" />
                <FaLinkedinIn size={20} className="hover:text-blue-400 transition cursor-pointer" />
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2025 MediDiagnose. Tous droits réservés. | Politique de confidentialité | Conditions d'utilisation</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
