import { useEffect, useState } from 'react';
import authStore from '@/auth/authStore';
import { loginWithDeriv } from '@/auth/loginWithDeriv';
import RootStore from '@/stores/root-store';
import { Analytics } from '@deriv-com/analytics';

/**
 * Thin auth helper around the new OAuth 2.0 PKCE flow.
 *
 *   - `oAuthLogout` clears the authStore (and the legacy mirror keys),
 *     calls the optional `handleLogout` for app-side cleanup, then
 *     reloads so every store re-initialises against an empty session.
 *   - `retriggerOAuth2Login` kicks off a fresh PKCE redirect to
 *     /oauth2/auth.
 *   - `isSingleLoggingIn` reflects whether we're mid-redirect (false
 *     while sitting on the page; never used as a CSRF gate).
 *
 * Removed (vs. the legacy implementation):
 *   - `Cookies.get('logged_state')` probing
 *   - `OAuth2Logout` from `@deriv-com/auth-client`
 *   - localStorage `accountsList` reads — authStore is the only truth
 */
export const useOauth2 = ({
    handleLogout,
    client,
}: {
    handleLogout?: () => Promise<void>;
    client?: RootStore['client'];
} = {}) => {
    const [isSingleLoggingIn, setIsSingleLoggingIn] = useState(false);

    useEffect(() => {
        const onUnhandled = (event: PromiseRejectionEvent) => {
            const code = (event?.reason as { error?: { code?: string } })?.error?.code;
            if (code === 'InvalidToken') setIsSingleLoggingIn(false);
        };
        window.addEventListener('unhandledrejection', onUnhandled);
        return () => window.removeEventListener('unhandledrejection', onUnhandled);
    }, []);

    const logoutHandler = async () => {
        client?.setIsLoggingOut(true);
        try {
            if (handleLogout) {
                try {
                    await handleLogout();
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('handleLogout error:', e);
                }
            }
            try {
                await client?.logout();
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('client.logout error:', e);
            }
            try {
                Analytics.reset();
            } catch {
                /* noop */
            }
            authStore.clearAuth();
            // Clear any residual legacy keys from previous installs.
            try {
                localStorage.removeItem('client.accounts');
                localStorage.removeItem('client_account_details');
                localStorage.removeItem('client.country');
                localStorage.removeItem('callback_token');
                localStorage.removeItem('deriv_auth');
                sessionStorage.removeItem('query_param_currency');
            } catch {
                /* noop */
            }
            window.location.assign('/');
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
        }
    };

    const retriggerOAuth2Login = async () => {
        setIsSingleLoggingIn(true);
        await loginWithDeriv();
    };

    return { oAuthLogout: logoutHandler, retriggerOAuth2Login, isSingleLoggingIn };
};
