import React, { useEffect, useState } from 'react';
import { Banknote, Smartphone, CheckCircle2, Hourglass, Wallet } from 'lucide-react';
import { choosePaymentMethodApi, confirmCashReceivedApi, type ConfirmCashResult } from '../../api/payments';

interface CashPaymentFlowProps {
  bookingId: number;
  fare: number;
  /** passenger shows the choice screen; driver sees the confirm screen */
  mode: 'passenger' | 'driver';
  passengerName?: string;
  onChanged?: () => void;
  onPaid?: (result: ConfirmCashResult) => void;
  onUPISelected?: () => void;
}

/**
 * Post-drop-off cash flow (docs/WORKFLOW.md §6).
 * Passenger: choose UPI or CASH; CASH leads to a waiting state — the passenger
 * can never mark the payment as successful themselves.
 * Driver: "Confirm Cash Received" -> Payment PAID + ₹10 fee accrued.
 */
export const CashPaymentFlow: React.FC<CashPaymentFlowProps> = ({
  bookingId, fare, mode, passengerName, onChanged, onPaid, onUPISelected,
}) => {
  const [choosing, setChoosing] = useState(mode === 'passenger');
  const [waiting, setWaiting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmCashResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChoosing(mode === 'passenger');
  }, [mode, bookingId]);

  const pickMethod = async (method: 'UPI' | 'CASH') => {
    setError(null);
    const res = await choosePaymentMethodApi(bookingId, method);
    if (!res.success) {
      setError(res.message ?? 'Could not set payment method.');
      return;
    }
    if (method === 'CASH') {
      setChoosing(false);
      setWaiting(true);
    } else {
      // UPI selection hands control back to the gateway button flow.
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
      setError(res.message ?? 'Could not confirm cash payment.');
      return;
    }
    setConfirmed(res);
    onPaid?.(res);
    onChanged?.();
  };

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <p className="text-sm font-extrabold text-navy-950">Cash Received</p>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          ₹{fare} payment confirmed. SyncroGo cash fee: <span className="font-bold text-green-700">₹10</span>.
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Added to today's outstanding — settle from your Cash Ride Fees card.
        </p>
      </div>
    );
  }

  /* ---------------- Passenger view ---------------- */

  if (mode === 'passenger') {
    if (waiting) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-extrabold text-navy-950">Cash Payment</p>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Please pay <span className="font-black text-navy-950">₹{fare}</span> directly to the driver.
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Once the driver receives the cash, they will confirm the payment.
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-700">
            <Hourglass className="w-3.5 h-3.5 animate-pulse" />
            Waiting for driver confirmation...
          </div>
        </div>
      );
    }

    if (choosing) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {error && <p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}
          <p className="text-sm font-extrabold text-navy-950">Ride Completed 🎉</p>
          <p className="mt-1 text-xs text-slate-500">Amount: <span className="font-black text-navy-950">₹{fare}</span></p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">How would you like to pay?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void pickMethod('UPI')}
              className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-all"
              style={{ background: 'linear-gradient(100deg,#087ee9,#08aa68)', boxShadow: '0 4px 12px rgba(7,126,233,0.25)' }}
            >
              <Smartphone className="w-3.5 h-3.5" />UPI
            </button>
            <button
              type="button"
              onClick={() => void pickMethod('CASH')}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700"
            >
              <Banknote className="w-3.5 h-3.5" />Cash
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  /* ---------------- Driver view ---------------- */

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      {error && <p className="mb-2 text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Banknote className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-extrabold text-navy-950">Cash Payment</p>
      </div>
      {passengerName && <p className="mt-1 text-xs text-slate-600">Passenger: <span className="font-bold">{passengerName}</span></p>}
      <p className="mt-0.5 text-xs text-slate-600">
        Amount: <span className="font-black text-navy-950">₹{fare}</span>
      </p>
      <p className="mt-1 text-[11px] text-slate-500">Please confirm after receiving the cash.</p>
      <button
        type="button"
        disabled={confirming}
        onClick={() => void confirmCash()}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2.5 text-xs font-bold text-white transition-all hover:bg-green-700 disabled:opacity-60"
      >
        <Wallet className="w-3.5 h-3.5" />
        {confirming ? 'Confirming...' : 'Confirm Cash Received'}
      </button>
    </div>
  );
};

export default CashPaymentFlow;
