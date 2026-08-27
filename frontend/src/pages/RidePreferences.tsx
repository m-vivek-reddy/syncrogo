import { useState } from "react";
import ProfileBackButton from "../components/profile/ProfileBackButton";

export default function RidePreferences() {
  const [preferences, setPreferences] = useState({ music: true, ac: true, smoking: false, conversations: true });
  const [saved, setSaved] = useState(false);
  const options = [["music", "Music during the ride", "Let co-riders know you enjoy music."], ["ac", "Air conditioning", "Prefer rides with AC available."], ["smoking", "Smoking allowed", "Allow smoking in rides you offer."], ["conversations", "Open to conversation", "Let co-riders know you are happy to chat."]] as const;
  return <div className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-xl"><ProfileBackButton /><h1 className="text-3xl font-bold text-slate-900">Ride Preferences</h1><p className="mt-2 text-slate-500">Manage your ride preferences.</p><div className="mt-6 space-y-3 rounded-2xl bg-white p-5 shadow-sm">{options.map(([key, title, description]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"><span><span className="block font-semibold text-slate-800">{title}</span><span className="text-sm text-slate-500">{description}</span></span><input type="checkbox" checked={preferences[key]} onChange={(event) => { setPreferences({ ...preferences, [key]: event.target.checked }); setSaved(false); }} className="h-5 w-5 accent-blue-600" /></label>)}<button type="button" onClick={() => setSaved(true)} className="w-full rounded-xl bg-syncro-dark py-3 font-semibold text-white hover:bg-slate-800">Save Preferences</button>{saved && <p className="text-center text-sm font-medium text-green-600">Preferences saved.</p>}</div></div></div>;
}
