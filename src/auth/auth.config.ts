/**
 * Deriv OAuth configuration.
 *
 * The redirect URI is computed dynamically so OAuth tokens always come
 * back to the SAME host the user logged in from:
 *
 *   - Production (Vercel)  → https://derivfortunepro.vercel.app/
 *   - Replit dev / preview → https://<repl-id>.<region>.replit.dev/
 *   - Custom domain        → https://<custom-domain>/
 *
 * The callback lands on the ROOT path (`/`) — `src/auth/earlyAuth.ts`
 * captures `acct1`/`token1`/`cur1` from any URL the moment the page
 * boots, so there is no need for a dedicated `/auth/callback` route.
 *
 * Production override: set `VITE_REDIRECT_URI` in the deployment env if
 * you need to pin the callback to a fixed URL (e.g. when only one
 * canonical host is registered on the Deriv app). When unset (the
 * default), `window.location.origin` is used.
 *
 * NOTE: Each origin must be registered on the Deriv app (id `VITE_APP_ID`)
 * for OAuth to actually redirect back with tokens.
 */

const DEFAULT_APP_ID = '111670';
const DEFAULT_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';

const readEnv = (name: string): string | undefined => {
    // process.env.VITE_* is replaced at build time by Rsbuild's `define`.
    const value = process.env[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const computeRedirectUri = (): string => {
    // Explicit env override always wins (use for production pinning).
    const envOverride = readEnv('VITE_REDIRECT_URI');
    if (envOverride) return envOverride;

    // Browser: redirect back to the ROOT URL of whatever origin the user
    // is on. The early-auth handler (src/auth/earlyAuth.ts) reads tokens
    // off the root URL, so no `/auth/callback` suffix is required.
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/`;
    }

    // SSR / non-browser fallback — value not actually used at runtime
    // because `loginWithDeriv` only fires from the browser.
    return '/';
};

export const AUTH_CONFIG = {
    appId: readEnv('VITE_APP_ID') ?? DEFAULT_APP_ID,
    oauthAuthorizeUrl: readEnv('VITE_OAUTH_URL') ?? DEFAULT_OAUTH_URL,
    get redirectUri() {
        return computeRedirectUri();
    },
    postLoginRedirect: '/dashboard',
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
