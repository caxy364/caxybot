/**
 * Stable, environment-independent Deriv OAuth configuration.
 *
 * IMPORTANT: This file intentionally does NOT use:
 *   - window.location.origin
 *   - location.href
 *   - any "localhost" / "127.0.0.1" detection
 *
 * The redirect URI is hard-coded so Deriv always returns the user to the
 * same registered callback regardless of where the app is being served
 * from (Replit dev preview, staging, or production).
 */

export const AUTH_CONFIG = {
    appId: '111670',
    redirectUri: 'https://ddb-ot--earnest567githu.replit.app/auth/callback',
    oauthAuthorizeUrl: 'https://oauth.deriv.com/oauth2/authorize',
    defaultLanguage: 'EN',
    postLoginRedirect: '/dashboard',
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
