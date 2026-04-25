import { AUTH_CONFIG, resolveRedirectUri } from './auth.config';

/**
 * Build the Deriv OAuth authorize URL.
 *
 * The redirect URI is resolved at call time (not import time) via
 * `resolveRedirectUri()` so it reflects the host the user is actually on.
 * That's what makes a single built bundle portable across Replit, Vercel,
 * Netlify, custom domains, etc.
 */
export const buildDerivOAuthUrl = (overrides?: { language?: string; state?: string }) => {
    const params = new URLSearchParams({
        app_id: AUTH_CONFIG.appId,
        l: overrides?.language ?? AUTH_CONFIG.defaultLanguage,
        redirect_uri: resolveRedirectUri(),
    });

    if (overrides?.state) {
        params.set('state', overrides.state);
    }

    return `${AUTH_CONFIG.oauthAuthorizeUrl}?${params.toString()}`;
};

/**
 * Trigger the Deriv OAuth login flow as a full-page redirect. Never opens
 * a popup or iframe — Deriv refuses to render its login page inside an
 * iframe ("refused to preview") and popups are blocked by mobile browsers.
 */
export const loginWithDeriv = (options?: { language?: string; account?: string }) => {
    const url = buildDerivOAuthUrl({
        language: options?.language,
        state: options?.account ? JSON.stringify({ account: options.account }) : undefined,
    });

    window.location.href = url;
};

export default loginWithDeriv;
