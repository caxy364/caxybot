import { useEffect, useState } from 'react';

type ParsedAccount = {
    loginid: string;
    token: string;
    currency: string;
};

const POST_LOGIN_REDIRECT = '/dashboard';

/**
 * Pull every (acctN, tokenN, curN) triple out of the OAuth callback URL and
 * group them by account.
 */
const parseTokensFromQuery = (search: string) => {
    const params = new URLSearchParams(search);

    const accountsList: Record<string, string> = {};
    const clientAccounts: Record<string, ParsedAccount> = {};
    let primaryToken: string | null = null;
    let primaryLoginId: string | null = null;

    params.forEach((value, key) => {
        const acctMatch = key.match(/^acct(\d+)$/);
        if (acctMatch) {
            const idx = acctMatch[1];
            const token = params.get(`token${idx}`) ?? '';
            const currency = params.get(`cur${idx}`) ?? '';
            if (token) {
                accountsList[value] = token;
                clientAccounts[value] = { loginid: value, token, currency };
                if (idx === '1') {
                    primaryToken = token;
                    primaryLoginId = value;
                }
            }
        }
    });

    return { accountsList, clientAccounts, primaryToken, primaryLoginId };
};

const AuthCallbackPage = () => {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const { accountsList, clientAccounts, primaryToken, primaryLoginId } = parseTokensFromQuery(
                window.location.search
            );

            if (!primaryToken || !primaryLoginId) {
                setError('Missing token1 or acct1 in callback URL.');
                return;
            }

            // Primary, secure storage as requested: sessionStorage.
            sessionStorage.setItem('authToken', primaryToken);
            sessionStorage.setItem('active_loginid', primaryLoginId);
            sessionStorage.setItem('accountsList', JSON.stringify(accountsList));
            sessionStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

            // Mirror to localStorage so the existing client / api-base layer
            // (which still reads from localStorage) keeps working.
            localStorage.setItem('authToken', primaryToken);
            localStorage.setItem('active_loginid', primaryLoginId);
            localStorage.setItem('accountsList', JSON.stringify(accountsList));
            localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));

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
