/**
 * UTM Attribution Tracking
 *
 * Captures UTM parameters from the URL on first landing and persists them
 * in localStorage so they survive navigation, login/signup, and are available
 * at checkout time.
 *
 * Uses first-touch attribution: once UTM params are captured, they are NOT
 * overwritten by subsequent page views without UTM params. They ARE refreshed
 * if the user arrives again with new UTM params (new campaign click).
 */

const UTM_STORAGE_KEY = "cgh_utm_attribution";

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

/**
 * Capture UTM parameters from the current URL and persist them.
 * Call this once on app mount (e.g., in AppWrapper or a layout effect).
 *
 * - If the URL contains any UTM param, all UTM values are saved (replacing old ones).
 * - If the URL has no UTM params, existing stored attribution is preserved.
 */
export function captureUtmParams(): void {
  if (typeof window === "undefined") return;

  const searchParams = new URLSearchParams(window.location.search);

  // Check if any UTM param is present in the current URL
  const hasUtm = UTM_PARAMS.some((key) => searchParams.has(key));
  if (!hasUtm) return;

  const utmData: UtmParams = {};
  for (const key of UTM_PARAMS) {
    const value = searchParams.get(key);
    if (value) {
      utmData[key] = value;
    }
  }

  try {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
  } catch {
    // localStorage may be unavailable (private browsing, full storage, etc.)
  }
}

/**
 * Retrieve stored UTM attribution params.
 * Returns an empty object if none are stored.
 */
export function getStoredUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}
