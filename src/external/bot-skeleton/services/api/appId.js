import { AUTH_CONFIG } from '@/auth/auth.config';
import authStore from '@/auth/authStore';
import { getSocketURL } from '@/components/shared';
import { website_name } from '@/utils/site-config';
import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import { getInitialLanguage } from '@deriv-com/translations';
import APIMiddleware from './api-middleware';

/**
 * Build a Deriv WebSocket. The protocol requires a numeric `app_id`,
 * so we always pin it to the legacy id (default 111670, overridable
 * via VITE_APP_ID). The OAuth client_id used for /oauth2/auth is a
 * different, alphanumeric value and lives in AUTH_CONFIG.clientId.
 */
export const generateDerivApiInstance = () => {
    const cleanedServer = getSocketURL().replace(/[^a-zA-Z0-9.]/g, '');
    const appId = String(AUTH_CONFIG.legacyAppId).replace(/[^0-9]/g, '') || '111670';
    const socket_url = `wss://${cleanedServer}/websockets/v3?app_id=${appId}&l=${getInitialLanguage()}&brand=${website_name.toLowerCase()}`;
    const deriv_socket = new WebSocket(socket_url);
    const deriv_api = new DerivAPIBasic({
        connection: deriv_socket,
        middleware: new APIMiddleware({}),
    });
    return deriv_api;
};

export const getLoginId = () => authStore.getActiveLoginid();

/**
 * Per-account WebSocket token from the authStore. Replaces the legacy
 * `localStorage.getItem('authToken')` lookup — authStore is now the
 * single source of truth.
 */
export const V2GetActiveToken = () => authStore.getActiveSessionToken();

export const V2GetActiveClientId = () => authStore.getActiveLoginid();

export const getToken = () => {
    const account = authStore.getActiveAccount();
    return {
        token: account?.token,
        account_id: account?.loginid,
    };
};
