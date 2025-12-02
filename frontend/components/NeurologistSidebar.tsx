"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FiHome, FiFileText, FiUsers, FiBarChart2, FiSettings, FiLogOut, FiMenu, FiMessageSquare } from "react-icons/fi";

export default function NeurologistSidebar() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const navItem = (label: string, href: string, Icon: any) => (
    <button
      onClick={() => router.push(href)}
      className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors w-full text-left"
    >
      <Icon className="text-lg text-slate-700" />
      {!collapsed && <span className="font-medium text-slate-800">{label}</span>}
    </button>
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  };

  return (
    <aside className={`bg-white border-r border-gray-200 ${collapsed ? 'w-20' : 'w-64'} p-4 flex flex-col justify-between transition-all`}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">NE</div>
            {!collapsed && <span className="text-lg font-bold text-slate-900">NeuroPanel</span>}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-slate-100">
            <FiMenu />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {navItem("Tableau de bord", "/neurologist/dashboard", FiHome)}
          {navItem("Dossiers", "/neurologist/cases", FiFileText)}
          {navItem("Dossiers traités", "/neurologist/treated", FiFileText)}
          {navItem("Patients", "/neurologist/patients", FiUsers)}
          {navItem("Assistant Médical", "/chatbot", FiMessageSquare)}
          {/* Assistant 2 removed */}
        </nav>
      </div>

      <div>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-50 text-red-600 w-full">
          <FiLogOut />
          {!collapsed && <span className="font-medium">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
