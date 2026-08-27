import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import Header from "../components/admin/Header";

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="min-h-screen bg-gray-100 lg:flex">
    <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    <div className="min-w-0 flex-1">
      <Header onMenuClick={() => setMenuOpen(true)} />
      <main className="p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
}
