import { AUTH_CONFIG } from './auth.config';

/**
 * Build the Deriv OAuth authorize URL.
 *
 * Constructed manually to match the EXACT format the spec requires:
 *
 *   https://oauth.deriv.com/oauth2/authorize?app_id=111670&redirect_uri=https://derivfortunepro.vercel.app/
 *
 * The redirect URI is the single registered production URL (the site
 * root). It is never derived from `window.location.origin`, never
 * falls back to localhost, and never points at a sub-path. Deriv will
 * redirect ONLY to this exact URL after login, where the OAuth tokens
 * are captured by `runEarlyAuth()` in `src/main.tsx` before React
 * mounts.
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
 * Trigger the Deriv OAuth login flow as a full-page redirect. Never opens
 * a popup or iframe — Deriv refuses to render its login page inside an
 * iframe and popups are blocked by mobile browsers.
 *
 * After login, Deriv redirects to AUTH_CONFIG.redirectUri (the site
 * root), and `runEarlyAuth()` captures the tokens from the URL.
 */
export const loginWithDeriv = (options?: { account?: string; language?: string }) => {
    // `language` accepted for backwards-compatibility with existing callers
    // but intentionally NOT included in the URL — keep the URL minimal and
    // exactly matching the format the spec requires.
    void options?.language;

    window.location.href = buildDerivOAuthUrl({ account: options?.account });
};

export default loginWithDeriv;
