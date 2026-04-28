import { useEffect } from 'react';
import authStore from '@/auth/authStore';
import { observer as globalObserver } from '@/external/bot-skeleton/utils/observer';
import { useOauth2 } from './auth/useOauth2';

/**
 * On an `InvalidToken` event from api-base, clear the authStore and
 * kick off a fresh OAuth 2.0 PKCE redirect.
 */
export const useInvalidTokenHandler = (): { unregisterHandler: () => void } => {
    const { retriggerOAuth2Login } = useOauth2();

    useEffect(() => {
        const handleInvalidToken = () => {
            authStore.clearAuth();
            void retriggerOAuth2Login();
        };
        globalObserver.register('InvalidToken', handleInvalidToken);
        return () => {
            globalObserver.unregister('InvalidToken', handleInvalidToken);
        };
    }, [retriggerOAuth2Login]);

    return {
        unregisterHandler: () => {
            // No-op — the effect cleanup unregisters automatically.
        },
    };
};

export default useInvalidTokenHandler;
