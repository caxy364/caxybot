/**
 * Utility functions for authentication-related operations
 */
import Cookies from 'js-cookie';

/**
 * Window of time after page load (ms) during which `clearAuthData` is a
 * no-op. Prevents transient WebSocket / authorize errors that fire during
 * the very first authorize-on-boot from wiping a freshly-captured OAuth
 * session and bouncing the user back to login.
 *
 * The user-initiated logout flow passes `force: true` to bypass this.
 */
const CLEAR_AUTH_GRACE_PERIOD_MS = 8000;

const pageLoadedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
const sincePageLoad = (): number =>
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) - pageLoadedAt;

/**
 * Clears authentication data from local + session storage. Optionally
 * reloads the page.
 *
 * IMPORTANT: during the initial grace window after page load, this is a
 * no-op unless the caller passes `force: true`. This is the single most
 * important guard preventing the "tokens disappear right after OAuth
 * callback" bug — earlier the WebSocket authorize call could fail
 * transiently on first connect, wipe storage, reload, and dump the user
 * back at the login screen even though the token was valid.
 */
export const clearAuthData = (is_reload: boolean = true, options?: { force?: boolean }): void => {
    const force = options?.force === true;
    const elapsed = sincePageLoad();

    if (!force && elapsed < CLEAR_AUTH_GRACE_PERIOD_MS) {
        // eslint-disable-next-line no-console
        console.warn(
            `[auth] clearAuthData suppressed (within ${CLEAR_AUTH_GRACE_PERIOD_MS}ms grace period; elapsed=${Math.round(
                elapsed
            )}ms). Pass {force:true} to clear anyway.`
        );
        return;
    }

    // eslint-disable-next-line no-console
    console.log('[auth] clearAuthData wiping session', { force, elapsed: Math.round(elapsed) });

    localStorage.removeItem('accountsList');
    localStorage.removeItem('clientAccounts');
    localStorage.removeItem('callback_token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('active_loginid');
    localStorage.removeItem('client.accounts');
    localStorage.removeItem('client.country');
    localStorage.removeItem('deriv_token');
    localStorage.removeItem('deriv_account');
    localStorage.removeItem('deriv_accounts');
    sessionStorage.removeItem('query_param_currency');
    sessionStorage.removeItem('deriv_token');
    sessionStorage.removeItem('deriv_account');
    sessionStorage.removeItem('deriv_accounts');

    if (is_reload) {
        location.reload();
    }
};

/**
 * Handles OIDC authentication failure by clearing auth data and showing logged out view
 * @param error - The error that occurred during OIDC authentication
 */
export const handleOidcAuthFailure = (error: any): void => {
    // Log the error
    console.error('OIDC authentication failed:', error);

    // Clear auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('active_loginid');
    localStorage.removeItem('clientAccounts');
    localStorage.removeItem('accountsList');

    // Set logged_state cookie to false
    Cookies.set('logged_state', 'false', {
        domain: window.location.hostname.split('.').slice(-2).join('.'),
        expires: 30,
        path: '/',
        secure: true,
    });

    // Reload the page to show the logged out view
    window.location.reload();
};
