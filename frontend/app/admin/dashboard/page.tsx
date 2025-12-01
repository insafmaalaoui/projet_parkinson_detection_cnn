"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr?")) return;

    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:8000/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (err) {
      console.error("Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="medical-header py-6 border-b border-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 font-bold">
              MD
            </div>
            <h1 className="text-2xl font-bold">Panneau Admin</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-white text-blue-600 hover:bg-blue-50 border-white"
          >
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Gestion des Utilisateurs</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
          </div>
        ) : (
          <div className="medical-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Date d'inscription
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === "patient"
                            ? "bg-blue-100 text-blue-700"
                            : user.role === "neurologist"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.role === "patient"
                          ? "Patient"
                          : user.role === "neurologist"
                          ? "Neurologue"
                          : "Admin"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        onClick={() => handleDeleteUser(user.id)}
                        variant="destructive"
                        size="sm"
                      >
                        Supprimer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
