import {
  LayoutDashboard,
  Users,
  Car,
  FileText,
  ShieldAlert,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const menu = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { name: "Users", icon: Users, path: "/admin/users" },
  { name: "Drivers", icon: Car, path: "/admin/drivers" },
  { name: "Documents", icon: FileText, path: "/admin/documents" },
  { name: "SOS", icon: ShieldAlert, path: "/admin/sos" },
  { name: "Payments", icon: CreditCard, path: "/admin/payments" },
  { name: "Reports", icon: BarChart3, path: "/admin/reports" },
  { name: "Settings", icon: Settings, path: "/admin/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("syncrogo_token");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <aside className="w-72 min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white flex flex-col border-r border-slate-800 shadow-2xl">

      {/* Logo */}
      <div className="px-8 py-8 border-b border-slate-800">

        <div className="flex items-center gap-3">

          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-xl font-bold shadow-lg">
            S
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-wide">
              SyncroGo
            </h1>

            <p className="text-slate-400 text-sm">
              Platform Management
            </p>
          </div>

        </div>

      </div>

      {/* Navigation */}
      <div className="flex-1 px-5 py-6">

        <p className="text-xs uppercase tracking-widest text-slate-500 mb-5 px-3">
          Navigation
        </p>

        <div className="space-y-2">
          {menu.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                `group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white" />
                  )}

                  <item.icon
                    size={21}
                    className="group-hover:scale-110 transition-transform"
                  />

                  <span className="font-medium">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}

        </div>

      </div>

      {/* Admin Card */}
      <div className="border-t border-slate-800 p-6">

        <div className="rounded-2xl bg-slate-800/70 p-4 mb-5">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-xl font-bold shadow-lg">
              A
            </div>

            <div>

              <h3 className="font-semibold text-white">
                Administrator
              </h3>

              <p className="text-sm text-slate-400">
                SyncroGo Admin
              </p>

            </div>

          </div>

        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 rounded-xl bg-red-600 hover:bg-red-700 py-3 font-medium transition-all duration-300 hover:shadow-lg"
        >
          <LogOut size={18} />
          Logout
        </button>

      </div>

    </aside>
  );
}