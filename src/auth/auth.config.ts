/**
 * Deriv OAuth 2.0 + PKCE configuration — single source of truth.
 *
 * Spec (2026):
 *   - Authorization endpoint: https://auth.deriv.com/oauth2/auth
 *   - Token endpoint:         https://auth.deriv.com/oauth2/token
 *   - Flow: Authorization Code with PKCE (S256)
 *   - client_id: 32UpAZvxBqalqEFHVMTNS  (OAuth client, alphanumeric)
 *
 * Legacy support:
 *   - WebSocket app_id stays at 111670. The Deriv WebSocket protocol
 *     (wss://ws.derivws.com/websockets/v3?app_id=...) requires a numeric
 *     app_id, so the new alphanumeric client_id cannot be used there.
 *     The OAuth access_token issued under client_id 32UpAZvxBqalqEFHVMTNS
 *     is what authorises the WebSocket.
 *
 * redirect_uri:
 *   - Must EXACTLY match a value registered on the Deriv app dashboard
 *     for client_id 32UpAZvxBqalqEFHVMTNS.
 *   - Defaults to `window.location.origin + '/'` so the same build runs
 *     in dev and prod, but can be pinned via VITE_REDIRECT_URI when a
 *     fixed callback URL is required.
 */

const DEFAULT_CLIENT_ID = '32UpAZvxBqalqEFHVMTNS';
const DEFAULT_LEGACY_APP_ID = '111670';
const DEFAULT_AUTHORIZE_URL = 'https://auth.deriv.com/oauth2/auth';
const DEFAULT_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const DEFAULT_SCOPE = 'trade account_manage';

const readEnv = (name: string): string | undefined => {
    // process.env.VITE_* is replaced at build time by Rsbuild's `define`.
    const value = process.env[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const getRedirectUri = (): string => {
    const override = readEnv('VITE_REDIRECT_URI');
    if (override) return override;
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/`;
    }
    // SSR / build-time fallback — overridden as soon as the browser runs.
    return 'http://localhost:5000/';
};

export const AUTH_CONFIG = {
    /** OAuth 2.0 client identifier (alphanumeric, new format). */
    clientId: readEnv('VITE_CLIENT_ID') ?? DEFAULT_CLIENT_ID,
    /** Numeric WebSocket app_id required by wss://ws.derivws.com (legacy). */
    legacyAppId: readEnv('VITE_APP_ID') ?? DEFAULT_LEGACY_APP_ID,
    authorizeUrl: readEnv('VITE_OAUTH_AUTHORIZE_URL') ?? DEFAULT_AUTHORIZE_URL,
    tokenUrl: readEnv('VITE_OAUTH_TOKEN_URL') ?? DEFAULT_TOKEN_URL,
    scope: readEnv('VITE_OAUTH_SCOPE') ?? DEFAULT_SCOPE,
    get redirectUri(): string {
        return getRedirectUri();
    },
    /** Where to send the user after a successful login. */
    postLoginRedirect: '/',
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
