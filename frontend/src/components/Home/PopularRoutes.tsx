interface PopularRoutesProps { onSelect: () => void; }

const routes = [
  { from: 'Hitech City', to: 'Gachibowli', distance: '12.4 km', fare: 120, seats: 1 },
  { from: 'Kukatpally', to: 'Madhapur', distance: '15.7 km', fare: 140, seats: 2 },
  { from: 'Secunderabad', to: 'Hitech City', distance: '10.8 km', fare: 110, seats: 3 },
];

export default function PopularRoutes({ onSelect }: PopularRoutesProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Popular Routes</h2>
        <button onClick={onSelect} className="text-xs font-bold text-indigo-600">Find an offer</button>
      </div>
      <div className="space-y-3">
        {routes.map((route) => (
          <button onClick={onSelect} key={`${route.from}-${route.to}`} className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span className="text-base">📍</span>
                  {route.from}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span className="text-base">↓</span>
                  {route.to}
                </div>
                <p className="mt-2 text-xs text-slate-400">{route.distance}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-emerald-600">₹{route.fare}</p>
                <p className="mt-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">{route.seats} seat{route.seats > 1 ? 's' : ''} left</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
