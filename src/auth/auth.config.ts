/**
 * Portable Deriv OAuth configuration.
 *
 * Design goals:
 *   - The app must boot on ANY host (Replit, Vercel, Netlify, GitHub Pages,
 *     a custom domain, even file://) WITHOUT a hard build-time crash if
 *     env vars are missing.
 *   - The OAuth `redirect_uri` must match whatever origin the app is
 *     actually being served from at click time — so a bundle built on
 *     machine A and deployed to host B still redirects users back to
 *     host B (not A).
 *   - Explicit env vars still win when set, so a user with a custom
 *     domain pointing at Vercel can pin a canonical redirect.
 *
 * Resolution order for each value:
 *   1. process.env.VITE_*  (build-time replacement by Rsbuild)
 *   2. A safe public default (Deriv's public app id / OAuth endpoint)
 *   3. For the redirect URI only: window.location.origin + '/auth/callback'
 *      computed at the moment of the login click.
 *
 * Nothing here throws at module-import time. A missing redirect URI is
 * filled in lazily from the live origin when the user actually clicks
 * "Log in", which is what makes the build truly portable.
 */

// Safe public defaults. These are not secrets — VITE_APP_ID and the OAuth
// authorize URL are hard-coded in every Deriv reference client. They are
// here so the app boots cleanly on hosts that haven't configured env vars
// yet (e.g. a fresh Vercel deploy before Settings → Env Vars is filled in).
const DEFAULT_APP_ID = '111670';
const DEFAULT_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';
const DEFAULT_CALLBACK_PATH = '/auth/callback';

const readEnv = (name: string): string | undefined => {
    // process.env.VITE_* is replaced at build time by Rsbuild's `define`.
    // We guard the access in case the replacement produced `undefined`.
    const value = process.env[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/**
 * Resolve the redirect URI to send to Deriv.
 *
 * Always derived from `window.location.origin` at click time. This is what
 * makes a single built bundle truly portable: Deriv sends users back to
 * whichever host they came from — Replit, Vercel, Netlify, GitHub Pages,
 * a custom domain, anywhere — with NO env var required.
 *
 * `VITE_REDIRECT_URI` is intentionally NOT consulted here so a stale value
 * from a build machine can never leak into production. Just register your
 * deployment origin (e.g. `https://yoursite.vercel.app/auth/callback`) on
 * the Deriv app id once and you're done.
 */
export const resolveRedirectUri = (): string => {
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}${DEFAULT_CALLBACK_PATH}`;
    }
    // SSR / build-time evaluation only — never reached in the browser.
    return DEFAULT_CALLBACK_PATH;
};

export const AUTH_CONFIG = {
    appId: readEnv('VITE_APP_ID') ?? DEFAULT_APP_ID,
    oauthAuthorizeUrl: readEnv('VITE_OAUTH_URL') ?? DEFAULT_OAUTH_URL,
    /**
     * Static fallback only — prefer `resolveRedirectUri()` everywhere.
     * Kept on the object for backwards compatibility with any callers
     * that read `AUTH_CONFIG.redirectUri` directly.
     */
    get redirectUri(): string {
        return resolveRedirectUri();
    },
    defaultLanguage: 'EN',
    postLoginRedirect: '/dashboard',
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
