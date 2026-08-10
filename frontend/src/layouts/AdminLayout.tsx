import { Outlet } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import Header from "../components/admin/Header";

export default function AdminLayout() {

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Universal Admin Sidebar */}
      <Sidebar />


      <div className="flex-1">

        {/* Universal Admin Header */}
        <Header />


        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>


      </div>

    </div>
  );
}