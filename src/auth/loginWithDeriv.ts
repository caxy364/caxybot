/**
 * Initiates the Deriv OAuth 2.0 Authorization Code flow with PKCE.
 *
 * Flow:
 *   1. Generate a fresh PKCE code_verifier + matching S256 code_challenge.
 *   2. Generate a random `state` for CSRF protection.
 *   3. Persist both verifier and expected state in sessionStorage so the
 *      callback handler can recover them after the round-trip.
 *   4. Redirect the browser to the authorization endpoint.
 */
import { AUTH_CONFIG } from './auth.config';
import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce';
import { PKCE_STORAGE_KEYS } from './oauthCallback';

export const buildDerivOAuthUrl = async (): Promise<string> => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const stateValue = generateState();

    sessionStorage.setItem(PKCE_STORAGE_KEYS.verifier, verifier);
    sessionStorage.setItem(PKCE_STORAGE_KEYS.state, stateValue);

    const url = new URL(AUTH_CONFIG.authorizeUrl);
    url.searchParams.set('client_id', AUTH_CONFIG.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', AUTH_CONFIG.redirectUri);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', stateValue);
    if (AUTH_CONFIG.scope) {
        url.searchParams.set('scope', AUTH_CONFIG.scope);
    }
    return url.toString();
};

export const loginWithDeriv = async (_options?: { account?: string; language?: string }): Promise<void> => {
    void _options;
    try {
        const target = await buildDerivOAuthUrl();
        window.location.assign(target);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[OAuth] failed to build authorize URL', e);
    }
};

export default loginWithDeriv;
