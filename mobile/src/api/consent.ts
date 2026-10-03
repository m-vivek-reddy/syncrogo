import apiClient from "./client";
import { POLICY_VERSION, type ConsentPurposeKey } from "../legal/legalContent";

// ────────────────────────────────────────────────────────────
// Consent state shape (mirrors the backend contract)
// ────────────────────────────────────────────────────────────

export type ConsentState = {
  consent: Record<ConsentPurposeKey, boolean>;
  policy_version: string | null;
  recorded_at: string | null;
  required: ConsentPurposeKey[];
  optional: ConsentPurposeKey[];
  has_all_required: boolean;
  history?: {
    id: number;
    purpose: ConsentPurposeKey;
    granted: boolean;
    policy_version: string | null;
    source: string | null;
    note: string | null;
    created_at: string | null;
  }[];
};

/** Grant or withdraw one or more purposes. `granted: false` withdraws. */
export const updateConsent = async (
  purposes: ConsentPurposeKey[],
  granted: boolean,
  source = "account_settings",
): Promise<{ ok: boolean; message?: string; data?: ConsentState }> => {
  try {
    const res = await apiClient.put("/api/v1/users/me/consent", {
      purposes,
      granted,
      source,
    });
    return { ok: true, data: res.data, message: res.data.message };
  } catch (error: any) {
    return {
      ok: false,
      message:
        error?.response?.data?.detail ||
        "Could not save your consent settings. Check your connection and try again.",
    };
  }
};

export const fetchConsent = async (): Promise<{
  ok: boolean;
  data?: ConsentState;
}> => {
  try {
    const res = await apiClient.get("/api/v1/users/me/consent");
    return { ok: true, data: res.data };
  } catch {
    return { ok: false };
  }
};

/**
 * Send a location-consent decision to the backend.
 *
 * Called when the user acts on the pre-OS-permission explanation screen, so
 * the audit trail records the decision even before (or without) the operating
 * system granting the permission itself.
 */
export const recordLocationConsent = (granted: boolean) =>
  updateConsent(["location"], granted, "location_prompt");

/** Record the driver-verification acknowledgement shown before document upload. */
export const recordDocumentConsent = (granted: boolean) =>
  updateConsent(["documents"], granted, "driver_verification");

export { POLICY_VERSION };