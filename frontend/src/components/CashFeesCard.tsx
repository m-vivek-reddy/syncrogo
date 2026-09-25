import { useCallback, useEffect, useState } from "react";
import {
  fetchCashFeeEligibilityApi,
  fetchCashFeeSummaryApi,
  settleCashFeesApi,
  type CashFeeEligibility,
  type CashFeeSummary,
} from "../api/payments";

/**
 * Driver dashboard card (docs/WORKFLOW.md §6):
 *  - "Cash Ride Fees" with today's fees, outstanding, cash ride count, [Pay].
 *  - 🔒 Paused banner when PRIOR-day fees are unpaid (402 rule at booking time).
 * Today's accruals never pause assignments; settling restores eligibility.
 */
export function CashFeesCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [summary, setSummary] = useState<CashFeeSummary | null>(null);
  const [eligibility, setEligibility] = useState<CashFeeEligibility | null>(null);
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSummary(await fetchCashFeeSummaryApi());
    setEligibility(await fetchCashFeeEligibilityApi());
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const payNow = async () => {
    setError(null);
    setSettling(true);
    const res = await settleCashFeesApi();
    setSettling(false);
    if ("success" in res && res.success === false) {
      setError(res.message);
      return;
    }
    setSettled(true);
    await load();
  };

  const outstanding = Number(summary?.outstanding ?? 0);
  const paused = eligibility?.paused === true;

  return (
    <div className="space-y-3">
      {paused && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-800">🔒 New Ride Assignments Paused</p>
          <p className="mt-1 text-sm text-red-700">
            You have <span className="font-bold">₹{Number(eligibility?.outstanding ?? outstanding).toFixed(0)}</span> in
            unpaid cash-ride platform fees.
          </p>
          <p className="mt-1 text-xs text-red-600">Your current ride is not affected.</p>
          <p className="mt-1 text-xs text-red-600">
            Pay the outstanding amount to receive new ride assignments.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="font-semibold text-slate-800">💵 Cash Ride Fees</p>
        {summary ? (
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Today's fees</span>
              <span className="font-semibold text-slate-800">₹{outstanding.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash rides</span>
              <span className="font-semibold text-slate-800">{summary.cash_rides}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="font-medium text-slate-700">Outstanding</span>
              <span className="font-bold text-slate-900">₹{outstanding.toFixed(0)}</span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Loading fee summary...</p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {settled && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            ✅ Fees Settled — ride assignment access restored.
          </p>
        )}

        {summary?.can_pay && !settled ? (
          <button
            type="button"
            disabled={settling}
            onClick={() => void payNow()}
            className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {settling ? "Paying..." : `Pay ₹${outstanding.toFixed(0)} Outstanding Fees`}
          </button>
        ) : (
          summary && (
            <p className="mt-3 text-sm font-medium text-emerald-600">✓ All fees are settled</p>
          )
        )}
      </div>
    </div>
  );
}
