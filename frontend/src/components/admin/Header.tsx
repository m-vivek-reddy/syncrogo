import { Bell, Menu, Moon, Search } from "lucide-react";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
    <div className="flex items-center gap-3">
      <button onClick={onMenuClick} aria-label="Open navigation" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 lg:hidden"><Menu size={24} /></button>
      <div className="min-w-0"><h1 className="truncate text-lg font-bold text-gray-900 sm:text-2xl">Admin Dashboard</h1><p className="hidden text-sm text-gray-600 sm:block">SyncroGo Platform Management</p></div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3"><label className="relative hidden md:block"><Search className="absolute left-3 top-2.5 text-gray-500" size={18} /><input placeholder="Search..." className="w-56 rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></label><button aria-label="Search" className="rounded-xl bg-gray-100 p-2.5 text-gray-700 md:hidden"><Search size={19} /></button><button aria-label="Notifications" className="rounded-xl bg-gray-100 p-2.5 text-gray-700"><Bell size={19}/></button><button aria-label="Theme" className="hidden rounded-xl bg-gray-100 p-2.5 text-gray-700 sm:block"><Moon size={19}/></button></div>
    </div>
  </header>;
}
