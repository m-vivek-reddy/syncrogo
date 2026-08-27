import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { getCurrentUser } from "../api/currentUser";
import { Trash2 } from "lucide-react";

type User = { id: number; name?: string; full_name?: string; email: string; role: string; is_online?: boolean };

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("admin");

  const loadUsers = async () => {
    try {
      const response = await apiClient.get("/admin/users");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Unable to load admin users:", error);
      setUsers([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem("syncrogo_token") || localStorage.getItem("token");
    if (token) {
      getCurrentUser(token).then((u) => {
        if (u?.role) setCurrentUserRole(u.role.toLowerCase());
      }).catch(() => {});
    }
    loadUsers();
  }, []);
  const filteredUsers = useMemo(() => users.filter((user) =>
    `${user.name || user.full_name || ""} ${user.email}`.toLowerCase().includes(search.toLowerCase())
  ), [users, search]);

  const changeRole = async (id: number, role: string) => {
    await apiClient.patch(`/admin/users/${id}/role`, undefined, { params: { new_role: role } });
    await loadUsers();
  };

  const deleteUser = async (user: User) => {
    const name = user.name || user.full_name || user.email;
    if (!window.confirm(`Delete the account for ${name}? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/users/${user.id}`);
      await loadUsers();
    } catch (error: any) {
      window.alert(error.response?.data?.detail || "Unable to delete this account.");
    }
  };

  const isEmployer = currentUserRole === "employer";

  return <div className="min-h-screen bg-gray-100 p-6">
    <div className="mb-6"><h1 className="text-2xl sm:text-4xl font-bold text-gray-900">User Management</h1><p className="text-gray-600 mt-2">Manage users, roles and account status</p></div>
    {loading && <p className="mb-4 text-gray-600">Loading users...</p>}
    <div className="bg-white p-4 rounded-xl shadow mb-5"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900" /></div>
    <div className="bg-white rounded-xl shadow overflow-x-auto border border-gray-200"><table className="min-w-[900px] w-full"><thead className="bg-gray-200 text-gray-700"><tr><th className="p-4 text-left">Name</th><th className="p-4 text-left">Email</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Change Role</th><th className="p-4">Actions</th></tr></thead><tbody>
      {filteredUsers.map((user) => { const name = user.name || user.full_name || "Unnamed user"; const role = user.role.toLowerCase(); return <tr key={user.id} className="border-t border-gray-200 hover:bg-gray-50"><td className="p-4 font-semibold text-gray-900">{name}</td><td className="p-4 text-gray-600">{user.email}</td><td className="p-4 text-center"><RoleBadge role={role} /></td><td className="p-4 text-center"><StatusBadge status={user.is_online ? "Online" : "Offline"} /></td><td className="p-4 text-center"><select value={role} disabled={isEmployer} title={isEmployer ? "Employers cannot change user roles" : "Change user role"} onChange={(e) => changeRole(user.id, e.target.value)} className={`border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white ${isEmployer ? "opacity-50 cursor-not-allowed" : ""}`}><option value="passenger">Passenger</option><option value="driver">Driver</option><option value="employer">Employer</option><option value="admin">Admin</option></select></td><td className="p-4 text-center"><button type="button" disabled={isEmployer} title={isEmployer ? "Employers cannot delete accounts" : "Delete account"} onClick={() => deleteUser(user)} className={`inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700 ${isEmployer ? "opacity-50 cursor-not-allowed" : ""}`}><Trash2 size={16} /> Delete</button></td></tr>; })}
    </tbody></table></div>
  </div>;
}

function RoleBadge({ role }: { role: string }) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  let colorClass = "bg-blue-100 text-blue-700";
  if (role === "admin") colorClass = "bg-red-100 text-red-700";
  else if (role === "employer") colorClass = "bg-purple-100 text-purple-700";
  else if (role === "driver") colorClass = "bg-emerald-100 text-emerald-700";
  return <span className={`px-4 py-1 rounded-full text-sm font-semibold ${colorClass}`}>{label}</span>;
}
function StatusBadge({ status }: { status: string }) { return <span className={`px-4 py-1 rounded-full text-sm font-semibold ${status === "Online" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{status}</span>; }
