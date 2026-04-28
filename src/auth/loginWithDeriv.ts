/**
 * Sends the user to Deriv to authenticate.
 *
 * Two flows are supported and live side-by-side so existing users
 * (legacy account format) and new users (new OAuth client) both work:
 *
 *   1. LEGACY (default): redirect to
 *      `https://oauth.deriv.com/oauth2/authorize?app_id=111670&l=...`.
 *      Deriv redirects back as `?acct1=&token1=&cur1=...`. The
 *      `migrateLegacyTokensFromUrl` boot step ingests those params
 *      into the authStore.
 *
 *   2. PKCE (opt-in via `VITE_USE_PKCE_LOGIN=true`): redirect to
 *      `https://auth.deriv.com/oauth2/auth` with code_challenge,
 *      state, scope, and redirect_uri. Callback parses `?code=&state=`
 *      and exchanges for an access_token at /oauth2/token.
 *
 * The login button calls `loginWithDeriv()`. Both callback handlers
 * run at boot, so a redirect of either shape will succeed.
 */
import { AUTH_CONFIG } from './auth.config';
import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce';
import { PKCE_STORAGE_KEYS } from './oauthCallback';

type LoginOptions = {
    /** Currency hint (e.g. "USD"). Forwarded to Deriv as `&account=...`. */
    account?: string;
    /** UI language code (e.g. "EN"). Forwarded as `&l=...`. */
    language?: string;
    /** Affiliate / partner SIDC token. Forwarded as `&affiliate_token=...`. */
    affiliateToken?: string;
    /** UTM campaign for partner attribution. Forwarded as `&utm_campaign=...`. */
    utmCampaign?: string;
};

const inferLanguage = (explicit?: string): string => {
    if (explicit) return explicit.toUpperCase();
    if (typeof document !== 'undefined') {
        const docLang = document.documentElement.getAttribute('lang');
        if (docLang) return docLang.toUpperCase();
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language.split('-')[0].toUpperCase();
    }
    return 'EN';
};

/**
 * Build the legacy Deriv OAuth URL. Format:
 *   https://oauth.deriv.com/oauth2/authorize
 *     ?app_id=111670
 *     &l=EN
 *     &brand=deriv
 *     [&account=USD]
 *     [&affiliate_token=...]
 *     [&utm_campaign=...]
 */
export const buildLegacyDerivOAuthUrl = (options?: LoginOptions): string => {
    const url = new URL(AUTH_CONFIG.legacyOAuthUrl);
    url.searchParams.set('app_id', String(AUTH_CONFIG.legacyAppId));
    url.searchParams.set('l', inferLanguage(options?.language));
    url.searchParams.set('brand', 'deriv');
    if (options?.account) url.searchParams.set('account', options.account);
    if (options?.affiliateToken) url.searchParams.set('affiliate_token', options.affiliateToken);
    if (options?.utmCampaign) url.searchParams.set('utm_campaign', options.utmCampaign);
    return url.toString();
};

/**
 * Build the new OAuth 2.0 + PKCE authorize URL. Only used when
 * `AUTH_CONFIG.usePkceLogin === true`.
 */
export const buildPkceDerivOAuthUrl = async (): Promise<string> => {
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

/** Backwards-compatible alias retained for any external imports. */
export const buildDerivOAuthUrl = buildPkceDerivOAuthUrl;

export const loginWithDeriv = async (options?: LoginOptions): Promise<void> => {
    try {
        const target = AUTH_CONFIG.usePkceLogin
            ? await buildPkceDerivOAuthUrl()
            : buildLegacyDerivOAuthUrl(options);
        window.location.assign(target);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[OAuth] failed to build authorize URL', e);
    }
};

export default loginWithDeriv;
