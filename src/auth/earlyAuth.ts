/**
 * Global early auth handler.
 *
 * Runs synchronously at module import time — BEFORE React mounts and BEFORE
 * any route guard, store, or `useEffect` can fire. This is the single
 * authoritative entry point that captures Deriv OAuth tokens off the URL,
 * persists the session, and navigates to /dashboard.
 *
 * Deriv's OAuth flow returns the user to the registered redirect URI with
 * tokens encoded as query parameters:
 *
 *   /?acct1=CR123&token1=a1-xxx&cur1=USD&acct2=VRTC456&token2=a1-yyy&cur2=USD
 *
 * Crucially, Deriv may land on the ROOT path (not /auth/callback), so the
 * handler runs on every URL — never tied to a specific route.
 *
 * After persisting the session it does a HARD redirect to /dashboard via
 * `window.location.replace` so the rest of the app boots fresh against the
 * stored tokens with no race against half-mounted React state.
 */

type DerivAccount = {
    account: string;
    token: string;
    currency: string;
};

type LegacyClientAccount = {
    loginid: string;
    token: string;
    currency: string;
};

const POST_LOGIN_REDIRECT = '/dashboard';

const parseAccountsFromQuery = (search: string): DerivAccount[] => {
    if (!search) return [];
    const params = new URLSearchParams(search);
    const accounts: DerivAccount[] = [];
    let idx = 1;
    // Walk acct1/token1/cur1 -> acct2/token2/cur2 -> ... until a gap.
    while (true) {
        const account = params.get(`acct${idx}`);
        const token = params.get(`token${idx}`);
        if (!account || !token) break;
        const currency = params.get(`cur${idx}`) ?? '';
        accounts.push({ account, token, currency });
        idx += 1;
    }
    return accounts;
};

const stripOauthParamsFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const keysToDelete: string[] = [];
    params.forEach((_value, key) => {
        if (/^(acct|token|cur)\d+$/.test(key) || key === 'state') {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach(k => params.delete(k));
    const remaining = params.toString();
    const newUrl = `${window.location.pathname}${remaining ? `?${remaining}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
};

const persistSession = (accounts: DerivAccount[]) => {
    const primary = accounts[0];

    // ---- Spec storage keys (sessionStorage) -------------------------------
    sessionStorage.setItem('deriv_accounts', JSON.stringify(accounts));
    sessionStorage.setItem('deriv_token', primary.token);
    sessionStorage.setItem('deriv_account', primary.account);

    // ---- App-compatibility keys (localStorage) ----------------------------
    // The rest of the app (api-base, stores, account switcher, layout guard)
    // already reads these keys to authorize WebSocket sessions. Writing them
    // here keeps every existing feature working with no further changes.
    const accountsList: Record<string, string> = {};
    const clientAccounts: Record<string, LegacyClientAccount> = {};
    for (const a of accounts) {
        accountsList[a.account] = a.token;
        clientAccounts[a.account] = {
            loginid: a.account,
            token: a.token,
            currency: a.currency,
        };
    }
    localStorage.setItem('accountsList', JSON.stringify(accountsList));
    localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
    localStorage.setItem('authToken', primary.token);
    localStorage.setItem('active_loginid', primary.account);

    // Mirror spec keys to localStorage too for any consumer that prefers it.
    localStorage.setItem('deriv_accounts', JSON.stringify(accounts));
    localStorage.setItem('deriv_token', primary.token);
    localStorage.setItem('deriv_account', primary.account);
};

/**
 * Returns `true` when an OAuth callback was detected and a redirect is
 * about to happen — caller should AVOID mounting React in that case so we
 * don't briefly render the unauthenticated UI before the page navigates.
 */
export const runEarlyAuth = (): boolean => {
    if (typeof window === 'undefined') return false;

    const accounts = parseAccountsFromQuery(window.location.search);
    if (accounts.length === 0) return false;

    try {
        // eslint-disable-next-line no-console
        console.log('[earlyAuth] captured', accounts.length, 'account(s) from OAuth callback');
        persistSession(accounts);
        stripOauthParamsFromUrl();
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[earlyAuth] failed to persist OAuth session', e);
        return false;
    }

    // Hard navigate so React boots fresh against the stored session and no
    // half-mounted guard can fire a redirect-to-login mid-flight.
    if (window.location.pathname !== POST_LOGIN_REDIRECT) {
        window.location.replace(POST_LOGIN_REDIRECT);
        return true;
    }
    return false;
};

/**
 * Convenience read helpers — exported so other modules can check whether a
 * Deriv session is present without poking storage keys directly.
 */
export const hasDerivSession = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('deriv_token')) return true;
    if (localStorage.getItem('authToken')) return true;
    return false;
};

export const hasOauthCallbackParams = (): boolean => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('acct1') && params.get('token1'));
};
