import {
  UserPlus,
  FileCheck,
  Download,
  Bell,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Add Driver",
      icon: UserPlus,
      color: "bg-blue-500",
      path: "/admin/drivers",
    },
    {
      title: "Approve Documents",
      icon: FileCheck,
      color: "bg-green-500",
      path: "/admin/documents",
    },
    {
      title: "Download Report",
      icon: Download,
      color: "bg-purple-500",
      path: "/admin/reports",
    },
    {
      title: "Send Notification",
      icon: Bell,
      color: "bg-red-500",
      path: "/admin/users",
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

      <h2 className="text-2xl font-bold text-slate-900 mb-6">
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={() => navigate(action.path)}
            className="rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition p-5 flex flex-col items-center gap-3"
          >
            <div
              className={`${action.color} w-14 h-14 rounded-xl flex items-center justify-center`}
            >
              <action.icon className="text-white" size={24} />
            </div>

            <span className="font-semibold text-slate-700">
              {action.title}
            </span>
          </button>
        ))}

      </div>

    </div>
  );
}
