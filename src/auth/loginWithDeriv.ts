const getRedirectUri = () => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/`;
    }

    return import.meta.env.VITE_REDIRECT_URI || 'https://derivfortunepro.vercel.app/';
};

const getAppId = () => import.meta.env.VITE_APP_ID || '111670';

const getOAuthUrl = () => import.meta.env.VITE_OAUTH_URL || 'https://oauth.deriv.com/oauth2/authorize';

export const buildDerivOAuthUrl = () => {
    const url = new URL(getOAuthUrl());

    url.searchParams.set('app_id', getAppId());
    url.searchParams.set('redirect_uri', getRedirectUri());

    return url.toString();
};

export const loginWithDeriv = (options?: { account?: string; language?: string }) => {
    void options?.language;
    void options?.account;

    window.location.href = buildDerivOAuthUrl();
};

export default loginWithDeriv;
