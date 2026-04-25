/**
 * Deriv OAuth configuration — single canonical redirect.
 *
 * The redirect URI is HARDCODED to the production callback URL
 * registered on the Deriv app (id 111670). This is intentional:
 *
 *   - Deriv's OAuth server only accepts redirect URIs that have been
 *     pre-registered on the app. We've registered exactly ONE URL,
 *     so any other value would be rejected.
 *   - Using `window.location.origin` produced different redirects per
 *     host (Replit dev domain, Vercel preview aliases, custom domains)
 *     and broke the login flow on every domain Deriv didn't know about.
 *   - Using `localhost` / `127.0.0.1` fallbacks created noisy "redirect
 *     URI mismatch" errors during local dev.
 *
 * If you need to deploy to a different production domain, register
 * that URL on the Deriv app and update DEFAULT_REDIRECT_URI here.
 */

const DEFAULT_APP_ID = '111670';
const DEFAULT_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';
const DEFAULT_REDIRECT_URI = 'https://derivfortunepro.vercel.app/auth/callback';

const readEnv = (name: string): string | undefined => {
    // process.env.VITE_* is replaced at build time by Rsbuild's `define`.
    const value = process.env[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const AUTH_CONFIG = {
    appId: readEnv('VITE_APP_ID') ?? DEFAULT_APP_ID,
    oauthAuthorizeUrl: readEnv('VITE_OAUTH_URL') ?? DEFAULT_OAUTH_URL,
    redirectUri: DEFAULT_REDIRECT_URI,
    postLoginRedirect: '/dashboard',
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
