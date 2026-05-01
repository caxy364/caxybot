import { useCallback, useEffect, useRef, useState } from 'react';
import { DerivPublicWebSocket, DerivWebSocketManager, WsMessageHandler } from '@/services/deriv-api';
import { getAuthenticatedWsUrl } from '@/services/deriv-api/otp';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

interface UsePublicWebSocketResult {
    connectionState: ConnectionState;
    error: string | null;
    getActiveSymbols: () => number;
    subscribeToTicks: (symbol: string) => number;
    onMessage: (handler: WsMessageHandler) => () => void;
    disconnect: () => void;
}

export function usePublicWebSocket(): UsePublicWebSocketResult {
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<DerivPublicWebSocket | null>(null);

    useEffect(() => {
        const ws = new DerivPublicWebSocket();
        wsRef.current = ws;
        setConnectionState('connecting');

        ws.connect()
            .then(() => setConnectionState('connected'))
            .catch(err => {
                setConnectionState('error');
                setError(err instanceof Error ? err.message : String(err));
            });

        return () => {
            ws.disconnect();
            wsRef.current = null;
        };
    }, []);

    const getActiveSymbols = useCallback((): number => {
        if (!wsRef.current) throw new Error('WebSocket not initialised');
        return wsRef.current.getActiveSymbols();
    }, []);

    const subscribeToTicks = useCallback((symbol: string): number => {
        if (!wsRef.current) throw new Error('WebSocket not initialised');
        return wsRef.current.subscribeToTicks(symbol);
    }, []);

    const onMessage = useCallback((handler: WsMessageHandler): (() => void) => {
        if (!wsRef.current) return () => {};
        return wsRef.current.onMessage(handler);
    }, []);

    const disconnect = useCallback(() => wsRef.current?.disconnect(), []);

    return { connectionState, error, getActiveSymbols, subscribeToTicks, onMessage, disconnect };
}

interface UseAuthenticatedWebSocketOptions {
    accessToken: string | null;
    accountId: string | null;
}

interface UseAuthenticatedWebSocketResult {
    connectionState: ConnectionState;
    error: string | null;
    subscribeBalance: () => number;
    subscribeToTicks: (symbol: string) => number;
    requestProposal: (params: Parameters<DerivWebSocketManager['requestProposal']>[0]) => number;
    buyContract: (proposalId: string, price: number) => number;
    monitorContract: (contractId: number) => number;
    getActiveSymbols: () => number;
    forgetAll: (type: string) => void;
    onMessage: (handler: WsMessageHandler) => () => void;
    disconnect: () => void;
}

export function useAuthenticatedWebSocket({
    accessToken,
    accountId,
}: UseAuthenticatedWebSocketOptions): UseAuthenticatedWebSocketResult {
    const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<DerivWebSocketManager | null>(null);

    useEffect(() => {
        if (!accessToken || !accountId) return;

        let cancelled = false;
        let ws: DerivWebSocketManager | null = null;

        const setup = async () => {
            try {
                setConnectionState('connecting');

                const wsUrl = await getAuthenticatedWsUrl(accessToken, accountId);
                if (cancelled) return;

                ws = new DerivWebSocketManager(wsUrl);
                wsRef.current = ws;

                await ws.connect();
                if (cancelled) {
                    ws.disconnect();
                    return;
                }

                setConnectionState('connected');
            } catch (err: unknown) {
                if (!cancelled) {
                    setConnectionState('error');
                    setError(err instanceof Error ? err.message : String(err));
                }
            }
        };

        setup();

        return () => {
            cancelled = true;
            ws?.disconnect();
            wsRef.current = null;
            setConnectionState('idle');
        };
    }, [accessToken, accountId]);

    const subscribeBalance = useCallback(() => {
        if (!wsRef.current) throw new Error('WebSocket not connected');
        return wsRef.current.subscribeBalance();
    }, []);

    const subscribeToTicks = useCallback((symbol: string) => {
        if (!wsRef.current) throw new Error('WebSocket not connected');
        return wsRef.current.subscribeToTicks(symbol);
    }, []);

    const requestProposal = useCallback(
        (params: Parameters<DerivWebSocketManager['requestProposal']>[0]) => {
            if (!wsRef.current) throw new Error('WebSocket not connected');
            return wsRef.current.requestProposal(params);
        },
        []
    );

    const buyContract = useCallback((proposalId: string, price: number) => {
        if (!wsRef.current) throw new Error('WebSocket not connected');
        return wsRef.current.buyContract(proposalId, price);
    }, []);

    const monitorContract = useCallback((contractId: number) => {
        if (!wsRef.current) throw new Error('WebSocket not connected');
        return wsRef.current.monitorContract(contractId);
    }, []);

    const getActiveSymbols = useCallback(() => {
        if (!wsRef.current) throw new Error('WebSocket not connected');
        return wsRef.current.getActiveSymbols();
    }, []);

    const forgetAll = useCallback((type: string) => {
        if (!wsRef.current) throw new Error('WebSocket not connected');
        wsRef.current.forgetAll(type);
    }, []);

    const onMessage = useCallback((handler: WsMessageHandler) => {
        if (!wsRef.current) return () => {};
        return wsRef.current.onMessage(handler);
    }, []);

    const disconnect = useCallback(() => {
        wsRef.current?.disconnect();
        wsRef.current = null;
    }, []);

    return {
        connectionState,
        error,
        subscribeBalance,
        subscribeToTicks,
        requestProposal,
        buyContract,
        monitorContract,
        getActiveSymbols,
        forgetAll,
        onMessage,
        disconnect,
    };
}
