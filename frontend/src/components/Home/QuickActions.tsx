interface QuickActionsProps {
  onOfferRide: () => void;
  onTrips: () => void;
  onPayments: () => void;
  onMessages: () => void;
}

export default function QuickActions({ onOfferRide, onTrips, onPayments, onMessages }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 text-left">
      <button onClick={onOfferRide} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xl">🚗</span>
          <div>
            <p className="text-sm font-bold">Offer Rides</p>
            <p className="text-[11px] text-slate-500">Nearby offers</p>
          </div>
        </div>
      </button>
      <button onClick={onTrips} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xl">🧳</span>
          <div>
            <p className="text-sm font-bold">My Trips</p>
            <p className="text-[11px] text-slate-500">Recent rides</p>
          </div>
        </div>
      </button>
      <button onClick={onPayments} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xl">💳</span>
          <div>
            <p className="text-sm font-bold">Wallet</p>
            <p className="text-[11px] text-slate-500">Payments</p>
          </div>
        </div>
      </button>
      <button onClick={onMessages} className="relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 text-slate-800">
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500" />
        <div className="flex items-center gap-3">
          <span className="text-xl">💬</span>
          <div>
            <p className="text-sm font-bold">Messages</p>
            <p className="text-[11px] text-slate-500">Driver chat</p>
          </div>
        </div>
      </button>
    </div>
  );
}
