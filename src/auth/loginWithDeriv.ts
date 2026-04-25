import { AUTH_CONFIG } from './auth.config';
import { hasDerivSession, hasOauthCallbackParams } from './earlyAuth';

/**
 * Build the Deriv OAuth authorize URL.
 *
 * Constructed manually to match the exact format Deriv expects:
 *
 *   https://oauth.deriv.com/oauth2/authorize?app_id=111670&redirect_uri=https://derivfortunepro.vercel.app/
 *
 * The redirect URI is the single registered production URL — never
 * derived from `window.location.origin`, never falls back to localhost.
 * Deriv will redirect ONLY to the registered URL after login.
 */
export const buildDerivOAuthUrl = (overrides?: { account?: string }) => {
    const base =
        `${AUTH_CONFIG.oauthAuthorizeUrl}` +
        `?app_id=${encodeURIComponent(AUTH_CONFIG.appId)}` +
        `&redirect_uri=${encodeURIComponent(AUTH_CONFIG.redirectUri)}`;

    // Optional account hint — preserved through the OAuth state param.
    if (overrides?.account) {
        return `${base}&state=${encodeURIComponent(JSON.stringify({ account: overrides.account }))}`;
    }

    return base;
};

/**
 * Window of time (ms) during which a second `loginWithDeriv()` invocation
 * is suppressed. Deriv's OAuth server flags duplicate /authorize calls
 * within ~60s and shows the user a "we noticed you approved a login a
 * few moments ago" error page. Tracking the last attempt in
 * `sessionStorage` (so it survives the redirect to Deriv and back)
 * guarantees no caller — Layout effect, main.tsx, useTMB, useOauth2, or
 * the header Login button — can trigger the duplicate.
 */
const LOGIN_THROTTLE_MS = 30_000;
const LAST_ATTEMPT_KEY = 'deriv_last_oauth_attempt_at';

/**
 * Trigger the Deriv OAuth login flow as a full-page redirect. Never opens
 * a popup or iframe — Deriv refuses to render its login page inside an
 * iframe and popups are blocked by mobile browsers.
 *
 * GUARDS (any one of these is sufficient to suppress the redirect):
 *   1. A Deriv session is already present in storage — caller is wrong
 *      to ask for a new login; just no-op.
 *   2. OAuth callback tokens are STILL on the URL (earlyAuth about to
 *      run / mid-flight). Re-firing OAuth would race the capture.
 *   3. We just initiated OAuth less than `LOGIN_THROTTLE_MS` ago. Deriv
 *      will block the duplicate /authorize and show its rate-limit page.
 */
export const loginWithDeriv = (options?: { account?: string; language?: string }) => {
    // `language` accepted for backwards-compatibility with existing callers
    // but intentionally NOT included in the URL — keep the URL minimal and
    // exactly matching the format the user specified.
    void options?.language;

    if (typeof window === 'undefined') return;

    if (hasDerivSession()) {
        // eslint-disable-next-line no-console
        console.warn('[loginWithDeriv] suppressed — Deriv session already in storage');
        return;
    }

    if (hasOauthCallbackParams()) {
        // eslint-disable-next-line no-console
        console.warn('[loginWithDeriv] suppressed — OAuth callback tokens still on URL');
        return;
    }

    try {
        const lastRaw = sessionStorage.getItem(LAST_ATTEMPT_KEY);
        const last = lastRaw ? Number(lastRaw) : 0;
        const sinceLast = Date.now() - last;
        if (last > 0 && sinceLast < LOGIN_THROTTLE_MS) {
            // eslint-disable-next-line no-console
            console.warn(
                `[loginWithDeriv] suppressed — last OAuth attempt was ${Math.round(
                    sinceLast / 1000
                )}s ago (throttle ${LOGIN_THROTTLE_MS / 1000}s). Deriv would reject as duplicate.`
            );
            return;
        }
        sessionStorage.setItem(LAST_ATTEMPT_KEY, String(Date.now()));
    } catch {
        // sessionStorage unavailable (e.g. Safari private mode) — proceed
        // anyway; the in-app guards still prevent the obvious duplicates.
    }

    // eslint-disable-next-line no-console
    console.log('[loginWithDeriv] redirecting to Deriv OAuth', {
        redirect_uri: AUTH_CONFIG.redirectUri,
    });
    window.location.href = buildDerivOAuthUrl({ account: options?.account });
};

export default loginWithDeriv;
