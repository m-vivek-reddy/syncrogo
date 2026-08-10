const drivers = [
  { name: 'Rahul', rating: '4.9', car: 'Swift', eta: '4 mins away', fare: '₹145' },
  { name: 'Priya', rating: '4.8', car: 'i20', eta: '6 mins away', fare: '₹160' },
  { name: 'Arjun', rating: '5.0', car: 'Baleno', eta: '8 mins away', fare: '₹138' },
];

export default function NearbyDrivers() {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Nearby Drivers</h2>
        <span className="text-xs font-semibold text-emerald-600">Live now</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {drivers.map((driver) => (
          <div key={driver.name} className="min-w-[170px] rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-800">🚗 {driver.name}</p>
              <span className="text-xs font-semibold text-amber-500">★ {driver.rating}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">{driver.car}</p>
            <p className="mt-1 text-xs text-slate-500">{driver.eta}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Estimated</span>
              <span className="text-sm font-extrabold text-emerald-600">{driver.fare}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
