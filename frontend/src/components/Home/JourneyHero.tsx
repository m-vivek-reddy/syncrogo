interface JourneyHeroProps { onFindOffer: () => void; }
export default function JourneyHero({ onFindOffer }: JourneyHeroProps) {
  return <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-950 p-6 text-white shadow-xl"><div className="flex items-end justify-between"><div><p className="text-2xl font-black leading-tight">Travel Together,<br /><span className="text-emerald-400">Save Together</span></p><p className="mt-2 text-xs text-blue-200">Find a shared ride that fits your route.</p><button onClick={onFindOffer} className="mt-4 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold shadow-lg hover:bg-emerald-600">Find Offers</button></div><span className="text-6xl opacity-30">🚗</span></div></section>;
}
