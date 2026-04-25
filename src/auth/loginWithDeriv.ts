import { AUTH_CONFIG } from './auth.config';

/**
 * Build the Deriv OAuth authorize URL.
 *
 * Constructed manually to match the exact format Deriv expects:
 *
 *   https://oauth.deriv.com/oauth2/authorize?app_id=111670&redirect_uri=https://derivfortunepro.vercel.app/auth/callback
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
 * Trigger the Deriv OAuth login flow as a full-page redirect. Never opens
 * a popup or iframe — Deriv refuses to render its login page inside an
 * iframe and popups are blocked by mobile browsers.
 *
 * After login, Deriv will redirect to AUTH_CONFIG.redirectUri
 * (`/auth/callback` on the production domain), which is the ONLY route
 * in this app that processes OAuth tokens.
 */
export const loginWithDeriv = (options?: { account?: string; language?: string }) => {
    // `language` accepted for backwards-compatibility with existing callers
    // but intentionally NOT included in the URL — keep the URL minimal and
    // exactly matching the format the user specified.
    void options?.language;

    window.location.href = buildDerivOAuthUrl({ account: options?.account });
};

export default loginWithDeriv;
