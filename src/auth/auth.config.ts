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
/** New OAuth 2.0 + PKCE endpoints (used only when explicitly enabled). */
const DEFAULT_AUTHORIZE_URL = 'https://auth.deriv.com/oauth2/auth';
const DEFAULT_TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const DEFAULT_SCOPE = 'trade account_manage';
/**
 * Legacy Deriv OAuth endpoint. This is the URL that has been working
 * for years and serves BOTH old-format and new-format Deriv accounts.
 * The redirect comes back as `?acct1=&token1=&cur1=&...` and is parsed
 * by `earlyAuth.migrateLegacyTokensFromUrl`.
 *
 * Login default uses this endpoint so existing users keep working
 * exactly as before; PKCE is parallel/optional.
 */
const DEFAULT_LEGACY_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';

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

/**
 * `usePkceLogin` toggles which authorize URL the login button hits:
 *   - false (default) → legacy `https://oauth.deriv.com/oauth2/authorize?app_id=...`
 *     This is the path that has been working for years and serves both old
 *     and new account holders. The callback parses `?acct1=&token1=`.
 *   - true → new OAuth 2.0 + PKCE flow at `https://auth.deriv.com/oauth2/auth`.
 *     Callback parses `?code=&state=` and exchanges at /oauth2/token.
 *
 * Set `VITE_USE_PKCE_LOGIN=true` to flip the default. Either way, BOTH
 * callback shapes are handled at boot, so links of either form will log
 * the user in.
 */
const readBoolEnv = (name: string, fallback: boolean): boolean => {
    const raw = readEnv(name);
    if (raw === undefined) return fallback;
    return raw === '1' || raw.toLowerCase() === 'true';
};

export const AUTH_CONFIG = {
    /** OAuth 2.0 client identifier (alphanumeric, new format — PKCE only). */
    clientId: readEnv('VITE_CLIENT_ID') ?? DEFAULT_CLIENT_ID,
    /** Numeric WebSocket app_id required by wss://ws.derivws.com (legacy). */
    legacyAppId: readEnv('VITE_APP_ID') ?? DEFAULT_LEGACY_APP_ID,
    /** Legacy OAuth authorize URL — primary login button target. */
    legacyOAuthUrl: readEnv('VITE_LEGACY_OAUTH_URL') ?? DEFAULT_LEGACY_OAUTH_URL,
    /** New PKCE authorize endpoint — used when usePkceLogin is true. */
    authorizeUrl: readEnv('VITE_OAUTH_AUTHORIZE_URL') ?? DEFAULT_AUTHORIZE_URL,
    /** New PKCE token endpoint. */
    tokenUrl: readEnv('VITE_OAUTH_TOKEN_URL') ?? DEFAULT_TOKEN_URL,
    /** OAuth scopes requested in the PKCE flow. */
    scope: readEnv('VITE_OAUTH_SCOPE') ?? DEFAULT_SCOPE,
    /** Toggle which login URL the button hits. Default: legacy (false). */
    usePkceLogin: readBoolEnv('VITE_USE_PKCE_LOGIN', false),
    get redirectUri(): string {
        return getRedirectUri();
    },
    /** Where to send the user after a successful login. */
    postLoginRedirect: '/',
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
