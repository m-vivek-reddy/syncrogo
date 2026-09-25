import { useEffect, useState } from "react";
import {
  choosePaymentMethodApi,
  confirmCashReceivedApi,
  type ConfirmCashResult,
} from "../api/payments";

interface CashPaymentFlowProps {
  bookingId: number;
  fare: number;
  /** passenger shows the choice screen; driver sees the confirm screen */
  mode: "passenger" | "driver";
  passengerName?: string;
  onChanged?: () => void;
  onPaid?: (result: ConfirmCashResult) => void;
  /** Called when the passenger picks UPI — parent should show the gateway button. */
  onUPISelected?: () => void;
}

/**
 * Post-drop-off cash flow (docs/WORKFLOW.md §6).
 * Passenger: choose UPI or CASH; CASH leads to a waiting state — the passenger
 * can never mark the payment as successful themselves.
 * Driver: "Confirm Cash Received" -> Payment PAID + ₹10 fee accrued.
 */
export function CashPaymentFlow({ bookingId, fare, mode, passengerName, onChanged, onPaid, onUPISelected }: CashPaymentFlowProps) {
  const [choosing, setChoosing] = useState(mode === "passenger");
  const [waiting, setWaiting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmCashResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChoosing(mode === "passenger");
  }, [mode, bookingId]);

  const pickMethod = async (method: "UPI" | "CASH") => {
    setError(null);
    const res = await choosePaymentMethodApi(bookingId, method);
    if (!res.success) {
      setError(res.message ?? "Could not set payment method.");
      return;
    }
    if (method === "CASH") {
      setChoosing(false);
      setWaiting(true);
    } else {
      // UPI selection hands control back to the standard gateway button flow.
      onUPISelected?.();
      onChanged?.();
    }
  };

  const confirmCash = async () => {
    setError(null);
    setConfirming(true);
    const res = await confirmCashReceivedApi(bookingId);
    setConfirming(false);
    if (!res.success) {
      setError(res.message ?? "Could not confirm cash payment.");
      return;
    }
    setConfirmed(res);
    onPaid?.(res);
    onChanged?.();
  };

  if (confirmed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-800">✅ Cash Received</p>
        <p className="mt-1 text-sm text-emerald-700">
          ₹{Number(confirmed.cash_fee?.amount ?? 0).toFixed(0)} fee confirmed. SyncroGo cash fee: ₹10.
        </p>
        <p className="mt-1 text-xs text-emerald-600">
          Added to today's outstanding — settle from your Cash Ride Fees card.
        </p>
      </div>
    );
  }

  /* ---------------- Passenger view ---------------- */

  if (mode === "passenger") {
    if (waiting) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">💵 Cash Payment</p>
          <p className="mt-1 text-sm text-amber-800">
            Please pay <span className="font-bold">₹{fare}</span> directly to the driver.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Once the driver receives the cash, they will confirm the payment.
          </p>
          <p className="mt-2 animate-pulse text-xs font-medium text-amber-600">
            Waiting for driver confirmation...
          </p>
        </div>
      );
    }

    if (choosing) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <p className="font-semibold text-slate-800">Ride Completed 🎉</p>
          <p className="mt-1 text-sm text-slate-600">Amount: ₹{fare}</p>
          <p className="mt-3 text-sm font-medium text-slate-700">How would you like to pay?</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void pickMethod("UPI")}
              className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              📱 UPI
            </button>
            <button
              type="button"
              onClick={() => void pickMethod("CASH")}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              💵 Cash
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  /* ---------------- Driver view ---------------- */

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <p className="font-semibold text-amber-900">💵 Cash Payment</p>
      {passengerName && (
        <p className="mt-1 text-sm text-amber-800">Passenger: {passengerName}</p>
      )}
      <p className="mt-1 text-sm text-amber-800">
        Amount: <span className="font-bold">₹{fare}</span>
      </p>
      <p className="mt-1 text-xs text-amber-600">Please confirm after receiving the cash.</p>
      <button
        type="button"
        disabled={confirming}
        onClick={() => void confirmCash()}
        className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {confirming ? "Confirming..." : "Confirm Cash Received"}
      </button>
    </div>
  );
}
