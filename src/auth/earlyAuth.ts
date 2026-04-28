/**
 * Legacy URL-token migration.
 *
 * The new login flow is OAuth 2.0 + PKCE (handled by oauthCallback.ts):
 * the user comes back to `redirect_uri?code=...&state=...` and we
 * exchange the code for an access token at /oauth2/token.
 *
 * This module exists ONLY to bridge users who arrive via the OLDER
 * Deriv redirect format `?acct1=&token1=&cur1=...` while the new app
 * registration is being rolled out. It pulls those params out of the
 * URL, populates the authStore once, and cleans the URL. After
 * everyone is on the new client_id this function is dead code and the
 * file can be deleted.
 */
import authStore, { AuthAccount } from './authStore';

const parseLegacyAccountsFromUrl = (search: string): AuthAccount[] => {
    const params = new URLSearchParams(search);
    const out: AuthAccount[] = [];
    let i = 1;
    while (true) {
        const loginid = params.get(`acct${i}`);
        const token = params.get(`token${i}`);
        if (!loginid || !token) break;
        out.push({ loginid, token, currency: params.get(`cur${i}`) ?? '' });
        i += 1;
    }
    return out;
};

export const migrateLegacyTokensFromUrl = (): boolean => {
    if (typeof window === 'undefined') return false;
    const accounts = parseLegacyAccountsFromUrl(window.location.search);
    if (accounts.length === 0) return false;

    // Treat the first per-account token as the OAuth access token —
    // it is what the WebSocket layer will use, and it lets the rest of
    // the app see "logged in".
    authStore.setSession({
        accessToken: accounts[0].token,
        accounts,
        activeLoginid: accounts[0].loginid,
    });

    try {
        const url = new URL(window.location.href);
        ['acct', 'token', 'cur'].forEach(prefix => {
            for (let i = 1; i <= accounts.length; i += 1) {
                url.searchParams.delete(`${prefix}${i}`);
            }
        });
        window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    } catch {
        /* noop */
    }
    return true;
};

export default migrateLegacyTokensFromUrl;
