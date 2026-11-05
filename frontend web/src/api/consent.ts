import { apiClient } from './client';

export type CookieConsent = {
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  policyVersion: string;
  savedAt: string;
};

export type ConsentFlag = 'terms' | 'privacy' | 'cookies' | 'marketing_email' | 'location' | 'documents' | 'sms';

export type ConsentState = {
  consent: Record<ConsentFlag, boolean>;
  policy_version: string | null;
  recorded_at: string | null;
  required: ConsentFlag[];
  optional: ConsentFlag[];
  has_all_required: boolean;
};

const COOKIE_CONSENT_KEY = 'syncrogo_cookie_consent_v1';

export function loadCookieConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    return value ? JSON.parse(value) as CookieConsent : null;
  } catch {
    return null;
  }
}

export function saveCookieConsent(
  choices: Pick<CookieConsent, 'preferences' | 'analytics' | 'marketing'>,
  policyVersion: string,
): CookieConsent {
  const consent = { ...choices, policyVersion, savedAt: new Date().toISOString() };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  return consent;
}

export async function getConsentApi(): Promise<{ success: boolean; data?: ConsentState; message?: string }> {
  try {
    const { data } = await apiClient.get('/api/v1/users/me/consent');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.detail || 'Could not load consent settings.' };
  }
}

export async function updateConsentApi(
  purposes: ConsentFlag[],
  granted: boolean,
  source = 'account_settings',
): Promise<{ success: boolean; data?: ConsentState; message?: string }> {
  try {
    const { data } = await apiClient.put('/api/v1/users/me/consent', {
      purposes,
      granted,
      source,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.detail || 'Could not save consent settings.' };
  }
}
