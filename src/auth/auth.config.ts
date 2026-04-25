/**
 * Deriv OAuth configuration — production is Vercel.
 *
 * The redirect URI is HARDCODED to the production callback URL that's
 * registered on the Deriv app (id 111670). It must NOT change and must
 * NOT depend on `window.location.origin`:
 *
 *   - Replit is a development environment only — local logins are not
 *     expected to round-trip through Deriv. Use a session in dev by
 *     opening the production URL in another tab if you need a real
 *     authorized session.
 *   - Production (and any host where login is supported) is registered
 *     as `https://derivfortunepro.vercel.app/` on the Deriv app.
 *
 * Optional: set `VITE_REDIRECT_URI` in the deployment env if you ever
 * need to pin the callback to a different URL (also registered on the
 * Deriv app). When unset (the default), `DEFAULT_REDIRECT_URI` is used.
 */

const DEFAULT_APP_ID = '111670';
const DEFAULT_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';
const DEFAULT_REDIRECT_URI = 'https://derivfortunepro.vercel.app/';

const readEnv = (name: string): string | undefined => {
    // process.env.VITE_* is replaced at build time by Rsbuild's `define`.
    const value = process.env[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const AUTH_CONFIG = {
    appId: readEnv('VITE_APP_ID') ?? DEFAULT_APP_ID,
    oauthAuthorizeUrl: readEnv('VITE_OAUTH_URL') ?? DEFAULT_OAUTH_URL,
    redirectUri: readEnv('VITE_REDIRECT_URI') ?? DEFAULT_REDIRECT_URI,
    postLoginRedirect: '/dashboard',
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
