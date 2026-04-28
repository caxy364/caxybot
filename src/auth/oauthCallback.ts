/**
 * OAuth 2.0 PKCE callback handler.
 *
 * Triggered when the browser arrives back at the `redirect_uri` carrying
 * `?code=...&state=...`. Validates state (CSRF), exchanges the code for
 * an access_token at the token endpoint, then writes the result into the
 * authStore. After this runs the URL is cleaned with replaceState so a
 * refresh does not retry the (now-spent) code.
 */
import { AUTH_CONFIG } from './auth.config';
import { authStore, AuthAccount } from './authStore';

const PKCE_VERIFIER_KEY = 'pkce_code_verifier';
const PKCE_STATE_KEY = 'pkce_state';

type TokenResponse = {
    access_token: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    /**
     * Some Deriv responses include the per-account token list inline.
     * We accept it under a few possible shapes to be tolerant of API
     * variants and forward whatever we can recognise into the authStore.
     */
    accounts?: Array<{ loginid?: string; account?: string; token?: string; currency?: string; cur?: string }>;
    account_list?: Array<{ loginid?: string; token?: string; currency?: string }>;
};

const parseAccountsFromResponse = (resp: TokenResponse): AuthAccount[] => {
    const out: AuthAccount[] = [];
    const push = (loginid?: string, token?: string, currency?: string) => {
        if (!loginid || !token) return;
        out.push({ loginid, token, currency: currency ?? '' });
    };
    if (Array.isArray(resp.accounts)) {
        resp.accounts.forEach(a =>
            push(a.loginid ?? a.account, a.token, a.currency ?? a.cur)
        );
    }
    if (Array.isArray(resp.account_list)) {
        resp.account_list.forEach(a => push(a.loginid, a.token, a.currency));
    }
    return out;
};

export type CallbackResult =
    | { handled: false }
    | { handled: true; ok: true }
    | { handled: true; ok: false; error: string };

const cleanUrl = () => {
    if (typeof window === 'undefined') return;
    try {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.pathname + url.hash);
    } catch {
        /* noop */
    }
};

const readAndClearVerifier = (): { verifier: string | null; expectedState: string | null } => {
    if (typeof window === 'undefined') return { verifier: null, expectedState: null };
    const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    const expectedState = sessionStorage.getItem(PKCE_STATE_KEY);
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(PKCE_STATE_KEY);
    return { verifier, expectedState };
};

/**
 * If the current URL is an OAuth callback (carries ?code=&state=), run
 * the token exchange and update the authStore. Returns a result object
 * describing what happened.
 */
export const handleOAuthCallback = async (): Promise<CallbackResult> => {
    if (typeof window === 'undefined') return { handled: false };
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const stateParam = params.get('state');
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    // No OAuth params at all -> nothing to do.
    if (!code && !errorParam) return { handled: false };

    // Auth server returned an error -> surface it and clean URL.
    if (errorParam) {
        cleanUrl();
        const message = errorDescription || errorParam;
        // eslint-disable-next-line no-console
        console.error('[OAuth] authorization error:', message);
        return { handled: true, ok: false, error: message };
    }

    const { verifier, expectedState } = readAndClearVerifier();

    // Strict CSRF check: callback state must match the value we stored
    // before redirecting to the auth server.
    if (!expectedState || stateParam !== expectedState) {
        cleanUrl();
        // eslint-disable-next-line no-console
        console.error('[OAuth] state mismatch');
        return { handled: true, ok: false, error: 'state_mismatch' };
    }
    if (!verifier) {
        cleanUrl();
        return { handled: true, ok: false, error: 'missing_pkce_verifier' };
    }
    if (!code) {
        cleanUrl();
        return { handled: true, ok: false, error: 'missing_code' };
    }

    try {
        const body = new URLSearchParams();
        body.set('grant_type', 'authorization_code');
        body.set('client_id', AUTH_CONFIG.clientId);
        body.set('code', code);
        body.set('code_verifier', verifier);
        body.set('redirect_uri', AUTH_CONFIG.redirectUri);

        const resp = await fetch(AUTH_CONFIG.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: body.toString(),
        });

        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            cleanUrl();
            // eslint-disable-next-line no-console
            console.error('[OAuth] token exchange failed', resp.status, text);
            return { handled: true, ok: false, error: `token_exchange_${resp.status}` };
        }

        const json = (await resp.json()) as TokenResponse;
        if (!json?.access_token) {
            cleanUrl();
            return { handled: true, ok: false, error: 'no_access_token' };
        }

        const accounts = parseAccountsFromResponse(json);
        authStore.setSession({
            accessToken: json.access_token,
            refreshToken: json.refresh_token ?? null,
            expiresInSeconds: json.expires_in ?? null,
            accounts,
            activeLoginid: accounts[0]?.loginid ?? null,
        });
        cleanUrl();
        return { handled: true, ok: true };
    } catch (e) {
        cleanUrl();
        // eslint-disable-next-line no-console
        console.error('[OAuth] token exchange threw', e);
        return { handled: true, ok: false, error: 'token_exchange_network' };
    }
};

export const PKCE_STORAGE_KEYS = {
    verifier: PKCE_VERIFIER_KEY,
    state: PKCE_STATE_KEY,
};

export default handleOAuthCallback;
