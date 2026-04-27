export const buildDerivOAuthUrl = () => {
    const APP_ID = import.meta.env.VITE_APP_ID;
    const REDIRECT = import.meta.env.VITE_REDIRECT_URI;
    const BASE = import.meta.env.VITE_OAUTH_URL;

    return `${BASE}?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}`;
};

export const loginWithDeriv = (options?: { account?: string; language?: string }) => {
    void options?.language;
    void options?.account;

    window.location.href = buildDerivOAuthUrl();
};

export default loginWithDeriv;
