import React from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import authStore from '@/auth/authStore';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { localize } from '@deriv-com/translations';
import App from './App';

/**
 * AuthWrapper is now a thin gate. The real authentication work — OAuth
 * 2.0 PKCE callback handling, legacy URL migration, session hydration —
 * happens in `src/main.tsx` BEFORE React mounts. By the time this
 * component renders, the authStore already reflects the user's true
 * state. We just render a loader for one tick to keep the
 * pre-existing UX smooth.
 */
export const AuthWrapper = () => {
    const { isOnline } = useOfflineDetection();
    // Single render-deferred tick so any subscribers that need to wire
    // themselves up to authStore see a complete snapshot first.
    const [isReady, setIsReady] = React.useState(false);

    React.useEffect(() => {
        // authStore.hydrateFromStorage() already ran in main.tsx; this
        // is just a yield to the event loop.
        const id = window.setTimeout(() => setIsReady(true), 0);
        return () => window.clearTimeout(id);
    }, []);

    const message = !isOnline ? localize('Loading offline mode...') : localize('Initializing...');

    if (!isReady) {
        return <ChunkLoader message={message} />;
    }

    void authStore; // keep import live for tree-shaking sanity
    return <App />;
};
