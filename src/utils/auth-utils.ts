/**
 * Auth utility — thin wrapper around authStore.
 *
 * `handleOidcAuthFailure` from the legacy mixed-auth flow has been
 * removed: the new OAuth 2.0 PKCE flow surfaces failures via the
 * callback handler in `src/auth/oauthCallback.ts`, and there is no
 * `logged_state` cookie to flip any more.
 */
import authStore from '@/auth/authStore';

export const clearAuthData = (is_reload: boolean = true): void => {
    authStore.clearAuth();
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
    if (is_reload && typeof window !== 'undefined') {
        window.location.reload();
    }
};
