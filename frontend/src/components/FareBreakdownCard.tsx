interface FareBreakdown {
  distance_km: number;
  base_fare: number;
  distance_fare: number;
  subtotal: number;
  platform_fee: number;
  gst: number;
  total_fare: number;
}

interface FareBreakdownCardProps {
  fareData: FareBreakdown;
}

const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

export default function FareBreakdownCard({ fareData }: FareBreakdownCardProps) {
  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 w-full" aria-label="Fare breakdown">
      <h2 className="text-base font-bold text-gray-800 mb-4">Estimated fare breakdown</h2>
      <div className="space-y-2.5 text-sm text-gray-600">
        <div className="flex justify-between"><span>Distance ({fareData.distance_km.toFixed(2)} km)</span><span className="font-medium text-gray-800">{formatCurrency(fareData.distance_fare)}</span></div>
        <div className="flex justify-between"><span>Base fare</span><span className="font-medium text-gray-800">{formatCurrency(fareData.base_fare)}</span></div>
        <div className="flex justify-between border-t border-gray-100 pt-2"><span>Subtotal</span><span className="font-medium text-gray-800">{formatCurrency(fareData.subtotal)}</span></div>
        <div className="flex justify-between text-xs text-gray-500"><span>Platform fee (10%)</span><span>{formatCurrency(fareData.platform_fee)}</span></div>
        <div className="flex justify-between text-xs text-gray-500"><span>GST (5%)</span><span>{formatCurrency(fareData.gst)}</span></div>
        <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-2"><span className="font-bold text-gray-900 text-base">Total payable</span><span className="font-extrabold text-syncro-blue text-lg">{formatCurrency(fareData.total_fare)}</span></div>
      </div>
    </section>
  );
}
