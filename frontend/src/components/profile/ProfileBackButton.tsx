import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfileBackButton() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate("/profile")} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-syncro-blue"><ChevronLeft size={18} />Back to Profile</button>;
}
