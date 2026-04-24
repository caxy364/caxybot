import { AUTH_CONFIG } from './auth.config';

/**
 * Build the Deriv OAuth authorize URL using the hard-coded config.
 * No origin / href / localhost is read from the runtime.
 */
export const buildDerivOAuthUrl = (overrides?: { language?: string; state?: string }) => {
    const params = new URLSearchParams({
        app_id: AUTH_CONFIG.appId,
        l: overrides?.language ?? AUTH_CONFIG.defaultLanguage,
        redirect_uri: AUTH_CONFIG.redirectUri,
    });

    if (overrides?.state) {
        params.set('state', overrides.state);
    }

    return `${AUTH_CONFIG.oauthAuthorizeUrl}?${params.toString()}`;
};

/**
 * Trigger the Deriv OAuth login flow by performing a full-page redirect
 * to the manually constructed authorize URL.
 *
 * This function deliberately bypasses @deriv-com/auth-client so no SDK
 * can rewrite the redirect URI to localhost / window.location.origin.
 */
export const loginWithDeriv = (options?: { language?: string; account?: string }) => {
    const url = buildDerivOAuthUrl({
        language: options?.language,
        state: options?.account ? JSON.stringify({ account: options.account }) : undefined,
    });

    window.location.href = url;
};

export default loginWithDeriv;
