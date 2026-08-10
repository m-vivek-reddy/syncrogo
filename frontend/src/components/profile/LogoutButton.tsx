import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  onLogout: () => void | Promise<void>;
}

export default function LogoutButton({
  onLogout,
}: LogoutButtonProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
    navigate("/login", { replace: true });
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm py-4
                 flex items-center justify-center gap-2
                 text-red-500 font-bold hover:bg-red-50 transition-all duration-200"
    >
      <LogOut size={20} strokeWidth={2.5} />
      <span>Log Out</span>
    </button>
  );
}