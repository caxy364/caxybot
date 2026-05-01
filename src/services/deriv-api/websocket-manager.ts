import { DERIV_PUBLIC_WS_URL, WsMessageHandler } from './types';

let reqIdCounter = 1;

function nextReqId(): number {
    return reqIdCounter++;
}

export class DerivWebSocketManager {
    private ws: WebSocket | null = null;
    private messageHandlers: Set<WsMessageHandler> = new Set();
    private isConnected = false;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private wsUrl: string;
    private subscriptionIds: Record<number, string> = {};

    constructor(wsUrl: string) {
        this.wsUrl = wsUrl;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.ws && this.isConnected) {
                resolve();
                return;
            }

            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                resolve();
            };

            this.ws.onmessage = event => {
                try {
                    const data = JSON.parse(event.data) as Record<string, unknown>;
                    this.messageHandlers.forEach(handler => handler(data));
                } catch {
                    /* ignore parse errors */
                }
            };

            this.ws.onerror = err => {
                console.error('[DerivWS] WebSocket error:', err);
                if (!this.isConnected) {
                    reject(new Error('WebSocket connection failed'));
                }
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.scheduleReconnect();
            };
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch(() => {
                /* reconnect silently */
            });
        }, 3000);
    }

    send(payload: Record<string, unknown>): void {
        if (!this.ws || !this.isConnected) {
            throw new Error('WebSocket is not connected');
        }
        this.ws.send(JSON.stringify(payload));
    }

    sendWithReqId(payload: Record<string, unknown>): number {
        const req_id = nextReqId();
        this.send({ ...payload, req_id });
        return req_id;
    }

    onMessage(handler: WsMessageHandler): () => void {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    subscribeBalance(): number {
        return this.sendWithReqId({ balance: 1, subscribe: 1 });
    }

    subscribeToTicks(symbol: string): number {
        return this.sendWithReqId({ ticks: symbol, subscribe: 1 });
    }

    requestProposal(params: {
        symbol: string;
        amount: number;
        basis: 'stake' | 'payout';
        contractType: string;
        currency: string;
        durationUnit: string;
        multiplier?: number;
    }): number {
        return this.sendWithReqId({
            proposal: 1,
            amount: params.amount,
            basis: params.basis,
            contract_type: params.contractType,
            currency: params.currency,
            duration_unit: params.durationUnit,
            ...(params.multiplier !== undefined ? { multiplier: params.multiplier } : {}),
            underlying_symbol: params.symbol,
            subscribe: 1,
        });
    }

    buyContract(proposalId: string, price: number): number {
        return this.sendWithReqId({ buy: proposalId, price });
    }

    monitorContract(contractId: number): number {
        return this.sendWithReqId({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 });
    }

    getActiveSymbols(): number {
        return this.sendWithReqId({ active_symbols: 'brief', product_type: 'basic' });
    }

    forgetSubscription(id: string): void {
        this.sendWithReqId({ forget: id });
    }

    forgetAll(subscriptionType: string): void {
        this.sendWithReqId({ forget_all: subscriptionType });
    }

    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
        this.isConnected = false;
        this.messageHandlers.clear();
    }

    get connected(): boolean {
        return this.isConnected;
    }
}

export class DerivPublicWebSocket extends DerivWebSocketManager {
    constructor() {
        super(DERIV_PUBLIC_WS_URL);
    }
}
