/**
 * Early OAuth token capture.
 *
 * Spec contract:
 *   1. Runs synchronously BEFORE React renders, BEFORE any auth-clearing
 *      logic, and BEFORE any API calls (called as the first statement in
 *      `src/main.tsx`).
 *   2. Reads acct1, token1, cur1, acct2, token2, cur2 ... from the
 *      current URL's search params.
 *   3. Stores accounts as an array of `{ account, token, currency }`
 *      under the spec keys `deriv_accounts`, `deriv_token`, and
 *      `deriv_account` in localStorage.
 *   4. Cleans the address bar with `history.replaceState({}, title, "/")`.
 *
 * Legacy compatibility: the existing in-app machinery (api-base, account
 * switcher, charts) still reads `authToken`, `active_loginid`,
 * `accountsList`, and `clientAccounts`. Those keys are written here
 * alongside the spec keys so the WebSocket authorize call performed by
 * `api_base.init()` continues to succeed without further refactoring.
 */

export type DerivAccount = {
    account: string;
    token: string;
    currency: string;
};

const SPEC_KEY_ACCOUNTS = 'deriv_accounts';
const SPEC_KEY_TOKEN = 'deriv_token';
const SPEC_KEY_ACCOUNT = 'deriv_account';

const parseAccountsFromUrl = (search: string): DerivAccount[] => {
    const params = new URLSearchParams(search);
    const accounts: DerivAccount[] = [];
    let i = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const account = params.get(`acct${i}`);
        const token = params.get(`token${i}`);
        if (!account || !token) break;
        const currency = params.get(`cur${i}`) ?? '';
        accounts.push({ account, token, currency });
        i += 1;
    }
    return accounts;
};

export type EarlyAuthResult = {
    captured: boolean;
    primary?: DerivAccount;
    accounts?: DerivAccount[];
};

export const runEarlyAuth = (): EarlyAuthResult => {
    if (typeof window === 'undefined') return { captured: false };

    const accounts = parseAccountsFromUrl(window.location.search);
    if (accounts.length === 0) return { captured: false };

    // eslint-disable-next-line no-console
    console.log('[AUTH] Tokens captured', { count: accounts.length });

    const primary = accounts[0];

    try {
        // Spec keys (the source of truth for the new auth contract).
        localStorage.setItem(SPEC_KEY_ACCOUNTS, JSON.stringify(accounts));
        localStorage.setItem(SPEC_KEY_TOKEN, primary.token);
        localStorage.setItem(SPEC_KEY_ACCOUNT, primary.account);

        // Legacy keys consumed by the rest of the app — written here so
        // api-base, the account switcher, and the bot builder remain
        // functional without changing their internals.
        const accountsList: Record<string, string> = {};
        const clientAccounts: Record<string, DerivAccount & { loginid: string }> = {};
        for (const a of accounts) {
            accountsList[a.account] = a.token;
            clientAccounts[a.account] = { loginid: a.account, ...a };
        }
        localStorage.setItem('accountsList', JSON.stringify(accountsList));
        localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
        localStorage.setItem('authToken', primary.token);
        localStorage.setItem('active_loginid', primary.account);

        // eslint-disable-next-line no-console
        console.log('[AUTH] Stored successfully');
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[AUTH] Storage failed', e);
        return { captured: true, primary, accounts };
    }

    // URL cleanup — must happen ONLY after the writes above succeed,
    // otherwise a storage failure would lose the tokens entirely.
    // Guard: do NOT clean if OAuth params are still present — clearing them
    // before downstream consumers (AuthWrapper, api-base) finish reading the
    // stored session can cause a race that wipes auth state.
    try {
        const hasOAuthParams =
            window.location.search.includes('acct') || window.location.search.includes('token');

        if (!hasOAuthParams) {
            window.history.replaceState({}, document.title, '/');
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[AUTH] URL clean failed', e);
    }

    return { captured: true, primary, accounts };
};

export default runEarlyAuth;
