/**
 * authStore — the SINGLE source of truth for authentication state.
 *
 * Everything that needs to know "is the user logged in?", "what is their
 * access_token?", or "what is their active loginid?" must read from here.
 * No more scattered cookie / URL / localStorage probes.
 *
 * Storage strategy:
 *   - Authoritative state lives in-memory (this module).
 *   - State is mirrored to localStorage under the `deriv_auth_v2` key so
 *     a page refresh restores the session without re-running OAuth.
 *   - For backwards compatibility with parts of the bot-skeleton that
 *     still read legacy keys directly (`authToken`, `active_loginid`,
 *     `accountsList`, `clientAccounts`), those keys are write-through
 *     mirrors of the authStore. They are NEVER read back into authStore.
 *
 * Subscribe with `subscribe(listener)` to react to login/logout. The
 * listener is called synchronously after every state mutation.
 */

const STORAGE_KEY = 'deriv_auth_v2';

export type AuthAccount = {
    /** The Deriv loginid, e.g. "CR1234567" or "VRTC9876543". */
    loginid: string;
    /** Per-account API token used for WebSocket authorize. */
    token: string;
    /** Currency code (USD, EUR, BTC, ...) — may be empty for new accounts. */
    currency: string;
};

export type AuthState = {
    /** Primary OAuth 2.0 access token issued by /oauth2/token. */
    accessToken: string | null;
    /** Optional refresh token (if the OAuth response provided one). */
    refreshToken: string | null;
    /** Token expiry as a UNIX ms timestamp; null when unknown. */
    expiresAt: number | null;
    /** All accounts available to the user after login. */
    accounts: AuthAccount[];
    /** loginid currently selected as "active". */
    activeLoginid: string | null;
};

type Listener = (state: AuthState) => void;

const emptyState = (): AuthState => ({
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    accounts: [],
    activeLoginid: null,
});

let state: AuthState = emptyState();
const listeners = new Set<Listener>();

const writeLegacyMirror = (s: AuthState) => {
    if (typeof window === 'undefined') return;
    try {
        if (!s.accessToken || s.accounts.length === 0) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('active_loginid');
            localStorage.removeItem('accountsList');
            localStorage.removeItem('clientAccounts');
            return;
        }
        const accountsList: Record<string, string> = {};
        const clientAccounts: Record<string, AuthAccount> = {};
        for (const acc of s.accounts) {
            accountsList[acc.loginid] = acc.token;
            clientAccounts[acc.loginid] = acc;
        }
        const active = s.accounts.find(a => a.loginid === s.activeLoginid) ?? s.accounts[0];
        localStorage.setItem('authToken', active.token);
        localStorage.setItem('active_loginid', active.loginid);
        localStorage.setItem('accountsList', JSON.stringify(accountsList));
        localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[authStore] legacy mirror write failed', e);
    }
};

const persist = (s: AuthState) => {
    if (typeof window === 'undefined') return;
    try {
        if (!s.accessToken) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[authStore] persist failed', e);
    }
    writeLegacyMirror(s);
};

const notify = () => {
    const snapshot = getState();
    listeners.forEach(l => {
        try {
            l(snapshot);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[authStore] listener error', e);
        }
    });
};

export const getState = (): AuthState => ({
    ...state,
    accounts: state.accounts.map(a => ({ ...a })),
});

export const getAccessToken = (): string | null => state.accessToken;

export const getActiveAccount = (): AuthAccount | null => {
    if (!state.activeLoginid) return state.accounts[0] ?? null;
    return state.accounts.find(a => a.loginid === state.activeLoginid) ?? state.accounts[0] ?? null;
};

/**
 * The token actually used to authorize the WebSocket. Prefer the active
 * account's per-account token (which the Deriv WebSocket understands)
 * and fall back to the OAuth access token when a per-account token has
 * not been provisioned yet.
 */
export const getActiveSessionToken = (): string | null => {
    const acc = getActiveAccount();
    if (acc?.token) return acc.token;
    return state.accessToken;
};

export const getActiveLoginid = (): string | null => {
    return getActiveAccount()?.loginid ?? null;
};

export const isAuthenticated = (): boolean => Boolean(state.accessToken);

export const hasValidAccessToken = (): boolean => {
    if (!state.accessToken) return false;
    if (state.expiresAt && Date.now() >= state.expiresAt) return false;
    return true;
};

export const subscribe = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export type SetSessionInput = {
    accessToken: string;
    refreshToken?: string | null;
    expiresInSeconds?: number | null;
    accounts?: AuthAccount[];
    activeLoginid?: string | null;
};

export const setSession = (input: SetSessionInput): void => {
    const accounts = input.accounts ?? [];
    const activeLoginid =
        input.activeLoginid ??
        (accounts.length > 0 ? accounts[0].loginid : state.activeLoginid ?? null);
    state = {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        expiresAt:
            typeof input.expiresInSeconds === 'number' && input.expiresInSeconds > 0
                ? Date.now() + input.expiresInSeconds * 1000
                : null,
        accounts,
        activeLoginid,
    };
    persist(state);
    notify();
};

export const setAccounts = (accounts: AuthAccount[], activeLoginid?: string | null): void => {
    const next: AuthState = {
        ...state,
        accounts,
        activeLoginid:
            activeLoginid ??
            (accounts.find(a => a.loginid === state.activeLoginid)?.loginid ??
                accounts[0]?.loginid ??
                null),
    };
    state = next;
    persist(state);
    notify();
};

export const setActiveLoginid = (loginid: string): void => {
    if (!state.accounts.find(a => a.loginid === loginid)) return;
    state = { ...state, activeLoginid: loginid };
    persist(state);
    notify();
};

export const clearAuth = (): void => {
    state = emptyState();
    persist(state);
    notify();
};

/**
 * Hydrate the in-memory state from localStorage. Safe to call multiple
 * times; later calls overwrite earlier state only if the persisted blob
 * is parseable AND has an access token.
 */
export const hydrateFromStorage = (): void => {
    if (typeof window === 'undefined') return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<AuthState>;
        if (!parsed?.accessToken) return;
        state = {
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken ?? null,
            expiresAt: parsed.expiresAt ?? null,
            accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
            activeLoginid: parsed.activeLoginid ?? null,
        };
        // Keep legacy mirror keys in sync on every page load — they may
        // have been wiped by browser settings or cleared by old code.
        writeLegacyMirror(state);
        notify();
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[authStore] hydrate failed', e);
    }
};

export const authStore = {
    getState,
    getAccessToken,
    getActiveAccount,
    getActiveSessionToken,
    getActiveLoginid,
    isAuthenticated,
    hasValidAccessToken,
    subscribe,
    setSession,
    setAccounts,
    setActiveLoginid,
    clearAuth,
    hydrateFromStorage,
};

export default authStore;
