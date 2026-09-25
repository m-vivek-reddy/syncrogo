import { apiClient } from "./client";

export type PayMethod = "UPI" | "CASH";

export interface MethodChoiceResult {
  success: boolean;
  booking_id?: number;
  method?: PayMethod;
  amount?: number;
  message?: string;
}

export interface ConfirmCashResult {
  success: boolean;
  message?: string;
  payment_id?: number;
  booking_status?: string;
  cash_fee?: {
    ledger_id: number;
    amount: number;
    status: string;
    ride_date: string;
    note?: string;
  };
}

export interface CashFeeSummary {
  date: string;
  cash_rides: number;
  outstanding: number | string;
  outstanding_rows: number[];
  can_pay: boolean;
}

export interface CashFeeEligibility {
  eligible: boolean;
  paused: boolean;
  message?: string;
  outstanding?: number;
  overdue_days?: string[];
  ledger_ids?: number[];
}

export interface SettlementResult {
  status: string;
  paid_amount: number;
  settled: number;
  settlement_id?: string;
}

function detail(err: any, fallback: string): any {
  return err?.response?.data?.detail ?? fallback;
}

/** Passenger picks UPI or CASH after the ride is COMPLETED. */
export async function choosePaymentMethodApi(bookingId: number, method: PayMethod): Promise<MethodChoiceResult> {
  try {
    const res = await apiClient.post(`/payments/${bookingId}/method`, { method });
    return { success: true, ...res.data };
  } catch (err: any) {
    return { success: false, message: String(detail(err, "Could not set payment method.")) };
  }
}

/** Driver confirms cash received. Fee accrues to the daily ledger. */
export async function confirmCashReceivedApi(bookingId: number): Promise<ConfirmCashResult> {
  try {
    const res = await apiClient.post(`/payments/${bookingId}/confirm-cash`);
    return { success: true, ...res.data };
  } catch (err: any) {
    return { success: false, message: String(detail(err, "Could not confirm cash payment.")) };
  }
}

export async function fetchCashFeeSummaryApi(): Promise<CashFeeSummary | null> {
  try {
    const res = await apiClient.get("/payments/cash-fees/summary");
    return { ...res.data, outstanding: Number(res.data.outstanding) || 0 };
  } catch {
    return null;
  }
}

export async function fetchCashFeeEligibilityApi(): Promise<CashFeeEligibility | null> {
  try {
    const res = await apiClient.get("/payments/cash-fees/eligibility");
    return { ...res.data, outstanding: Number(res.data.outstanding) || 0 };
  } catch {
    return null;
  }
}

export async function settleCashFeesApi(): Promise<SettlementResult | { success: false; message: string }> {
  try {
    const res = await apiClient.post("/payments/cash-fees/settle");
    return res.data;
  } catch (err: any) {
    return { success: false, message: String(detail(err, "Settlement failed. Please try again.")) };
  }
}
