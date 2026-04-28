/**
 * useTMB — neutralised stub.
 *
 * The legacy Token Management Backend flow (sessions/active +
 * `logged_state` cookie + Firebase remote config) has been removed in
 * favour of OAuth 2.0 PKCE. This hook is kept as a stable shape so the
 * many call sites (header, layout, mobile menu, app-root, etc.) keep
 * compiling without churn, but it is now a no-op:
 *
 *   - `is_tmb_enabled` is permanently `false`
 *   - `onRenderTMBCheck` resolves immediately
 *   - `handleLogout` clears the authStore and reloads
 *   - the initialisation flags settle to `true` on the first render
 */
import { useCallback, useMemo } from 'react';
import authStore from '@/auth/authStore';

declare global {
    interface Window {
        is_tmb_enabled?: boolean;
    }
}

type UseTMBReturn = {
    handleLogout: () => Promise<void>;
    isOAuth2Enabled: boolean;
    is_tmb_enabled: boolean;
    onRenderTMBCheck: (fromLoginButton?: boolean, setIsAuthenticating?: (value: boolean) => void) => Promise<void>;
    isTmbEnabled: () => Promise<boolean>;
    isInitialized: boolean;
    isTmbCheckComplete: boolean;
};

const useTMB = (): UseTMBReturn => {
    if (typeof window !== 'undefined') {
        window.is_tmb_enabled = false;
    }

    const handleLogout = useCallback(async () => {
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
        if (typeof window !== 'undefined') window.location.assign('/');
    }, []);

    const onRenderTMBCheck = useCallback(
        async (_fromLoginButton?: boolean, setIsAuthenticating?: (value: boolean) => void) => {
            void _fromLoginButton;
            if (setIsAuthenticating) setIsAuthenticating(false);
        },
        []
    );

    const isTmbEnabled = useCallback(async () => false, []);

    return useMemo(
        () => ({
            handleLogout,
            isOAuth2Enabled: true,
            is_tmb_enabled: false,
            onRenderTMBCheck,
            isTmbEnabled,
            isInitialized: true,
            isTmbCheckComplete: true,
        }),
        [handleLogout, onRenderTMBCheck, isTmbEnabled]
    );
};

export default useTMB;
