/**
 * Environment-driven Deriv OAuth configuration.
 *
 * All values come from build-time environment variables — NO URLs are
 * hard-coded here. Set them via `.env`, your hosting provider's dashboard
 * (Replit / Vercel / Cloudflare), or your shell:
 *
 *   VITE_APP_ID         Your Deriv app id (e.g. 111670)
 *   VITE_REDIRECT_URI   Full callback URL, must match the Deriv app config
 *   VITE_OAUTH_URL      Deriv OAuth authorize endpoint
 *
 * IMPORTANT: This file intentionally does NOT use:
 *   - window.location.origin
 *   - location.href
 *   - any "localhost" / "127.0.0.1" detection
 *
 * Switching environments (local, Replit, Vercel, Cloudflare) is done by
 * changing the env vars only — no code changes required.
 */

const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (!value || typeof value !== 'string') {
        throw new Error(
            `[auth.config] Missing required environment variable: ${name}. ` +
                `Set ${name} in your .env file or hosting provider's environment configuration.`
        );
    }
    return value;
};

export const AUTH_CONFIG = {
    appId: requireEnv('VITE_APP_ID'),
    redirectUri: requireEnv('VITE_REDIRECT_URI'),
    oauthAuthorizeUrl: requireEnv('VITE_OAUTH_URL'),
    defaultLanguage: 'EN',
    postLoginRedirect: '/dashboard',
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
