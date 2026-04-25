import { useEffect, useState } from 'react';

/**
 * Shape requested by the spec — a flat array of accounts, NOT a map keyed
 * by loginid. Stored in localStorage under "deriv_accounts".
 */
type DerivAccount = {
    account: string;
    token: string;
    currency: string;
};

/**
 * Internal, app-compatibility shape — keeps the existing rest of the app
 * (api-base, stores, etc.) working. Stored under "accountsList" /
 * "clientAccounts" so we don't log the user out of every other feature.
 */
type LegacyClientAccount = {
    loginid: string;
    token: string;
    currency: string;
};

const POST_LOGIN_REDIRECT = '/dashboard';

/**
 * Pull every (acctN, tokenN, curN) triple out of the OAuth callback URL.
 *
 * Deriv's OAuth flow returns tokens as QUERY parameters (NOT a hash
 * fragment, NOT an `access_token` field). The callback URL looks like:
 *
 *   /auth/callback?acct1=CR123&token1=a1-xxx&cur1=USD
 *                 &acct2=VRTC456&token2=a1-yyy&cur2=USD
 *
 * We walk the indices `1..N` until we hit a missing `acctN`, so the
 * parser naturally handles any number of linked accounts.
 */
const parseAccountsFromQuery = (search: string) => {
    const params = new URLSearchParams(search);

    const accounts: DerivAccount[] = [];
    let idx = 1;

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

const AuthCallbackPage = () => {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const accounts = parseAccountsFromQuery(window.location.search);

            // Debug logs — make it obvious in DevTools what came back from Deriv.
            // eslint-disable-next-line no-console
            console.log('[auth/callback] accounts parsed from URL:', accounts);

            if (accounts.length === 0) {
                setError('No tokens were found in the callback URL.');
                // eslint-disable-next-line no-console
                console.error('[auth/callback] no acct1/token1 in', window.location.search);
                return;
            }

            const primary = accounts[0];
            // eslint-disable-next-line no-console
            console.log('[auth/callback] selected primary token:', primary.token, 'for account:', primary.account);

            // ---- Spec storage keys (exactly as requested) ------------------
            localStorage.setItem('deriv_accounts', JSON.stringify(accounts));
            localStorage.setItem('deriv_token', primary.token);
            localStorage.setItem('deriv_account', primary.account);

            // ---- App-compatibility keys ------------------------------------
            // The rest of the app (api-base, stores, account switcher) reads
            // these keys to authorize WebSocket sessions. Writing them here
            // keeps the bot builder, charts, and account switcher working
            // immediately after login. Pure addition — no spec key is
            // overwritten or removed.
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

            // Mirror to sessionStorage too (tab-scoped, useful for SPAs that
            // prefer non-persistent auth state).
            sessionStorage.setItem('deriv_accounts', JSON.stringify(accounts));
            sessionStorage.setItem('deriv_token', primary.token);
            sessionStorage.setItem('deriv_account', primary.account);

            // Strip the tokens out of the address bar before navigating —
            // they should not linger in browser history.
            window.history.replaceState({}, document.title, window.location.pathname);

            window.location.replace(POST_LOGIN_REDIRECT);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[auth/callback] failed to process tokens', e);
            setError('Failed to process login response.');
        }
    }, []);

    if (error) {
        return (
            <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
                <h2>Login failed</h2>
                <p>{error}</p>
                <a href='/'>Return home</a>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
            <p>Signing you in…</p>
        </div>
    );
};

export default AuthCallbackPage;
