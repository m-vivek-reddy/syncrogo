import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import ProfileBackButton from '../components/profile/ProfileBackButton';

type Vehicle = { make: string; model: string; license_plate: string; capacity: number };
const emptyVehicle: Vehicle = { make: '', model: '', license_plate: '', capacity: 4 };

export default function Vehicles() {
  const [vehicle, setVehicle] = useState<Vehicle>(emptyVehicle);
  const [exists, setExists] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiClient.get('/vehicles/me').then(({ data }) => { setVehicle(data); setExists(true); }).catch(() => undefined);
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await (exists ? apiClient.put('/vehicles/me', vehicle) : apiClient.post('/vehicles/', vehicle));
      setExists(true);
      setMessage('Vehicle saved successfully.');
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Unable to save vehicle.');
    }
  };

  return <main className="mx-auto max-w-xl p-6"><ProfileBackButton /><h1 className="text-2xl font-bold text-slate-900">My Vehicle</h1><p className="mt-1 text-slate-500">Add or update the vehicle used for your rides.</p><form onSubmit={save} className="mt-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm">
    {(['make', 'model', 'license_plate'] as const).map((field) => <input key={field} required value={vehicle[field]} onChange={(e) => setVehicle({ ...vehicle, [field]: e.target.value })} placeholder={field.replace('_', ' ').toUpperCase()} className="w-full rounded-xl border border-slate-200 px-4 py-3" />)}
    <input required min="1" max="12" type="number" value={vehicle.capacity} onChange={(e) => setVehicle({ ...vehicle, capacity: Number(e.target.value) })} placeholder="Capacity" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
    <button className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white">{exists ? 'Update Vehicle' : 'Add Vehicle'}</button>{message && <p className="text-sm text-slate-600">{message}</p>}
  </form></main>;
}
