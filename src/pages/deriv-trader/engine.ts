import { api_base } from '@/external/bot-skeleton';

export type TVolatilitySymbol = '1HZ15V' | '1HZ30V' | '1HZ90V';

export const VOLATILITY_SYMBOLS: { code: TVolatilitySymbol; label: string }[] = [
    { code: '1HZ15V', label: 'Volatility 15 (1s)' },
    { code: '1HZ30V', label: 'Volatility 30 (1s)' },
    { code: '1HZ90V', label: 'Volatility 90 (1s)' },
];

export type TStrategyCondition = 'odd' | 'even' | 'over' | 'under' | 'rise' | 'fall';
export type TStrategyAction = 'odd' | 'even' | 'over' | 'under' | 'rise' | 'fall';

export type TStrategy = {
    id: string;
    last_n: number;
    condition: TStrategyCondition;
    action: TStrategyAction;
    over_under_value?: number;
};

export type TBotConfig = {
    stake: number;
    target_profit: number;
    stop_loss: number;
    martingale_enabled: boolean;
    martingale_multiplier: number;
    digit_filter_enabled: boolean;
    digit_filter_last_n: number;
    digit_filter_target: 4 | 5;
    hedge_enabled: boolean;
    strategies: TStrategy[];
    symbols: TVolatilitySymbol[];
};

export type TEngineEvent =
    | { type: 'status'; message: string }
    | { type: 'pnl'; total: number }
    | { type: 'trade'; symbol: string; contract_type: string; stake: number }
    | { type: 'error'; message: string }
    | { type: 'stopped'; reason: string };

type TListener = (event: TEngineEvent) => void;

const lastDigit = (price: number, pip_size = 2) => {
    const str = price.toFixed(pip_size);
    return Number(str.charAt(str.length - 1));
};

export class SmartHedgingEngine {
    config: TBotConfig;
    is_running = false;
    total_pnl = 0;
    current_stake = 0;
    consecutive_losses = 0;
    tick_history: Record<string, number[]> = {};
    pip_sizes: Record<string, number> = {};
    subscriptions: Map<string, any> = new Map();
    contract_subscription: any = null;
    listeners: TListener[] = [];
    open_contracts: Set<number> = new Set();
    settled_contracts: Set<number> = new Set();
    in_flight: Set<string> = new Set();

    constructor(config: TBotConfig) {
        this.config = config;
        this.current_stake = config.stake;
    }

    on(listener: TListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private emit(event: TEngineEvent) {
        this.listeners.forEach(l => {
            try {
                l(event);
            } catch (e) {
                /* noop */
            }
        });
    }

    async start() {
        if (this.is_running) return;
        if (!api_base?.api) {
            this.emit({ type: 'error', message: 'Not connected to Deriv. Please log in first.' });
            return;
        }
        this.is_running = true;
        this.total_pnl = 0;
        this.current_stake = this.config.stake;
        this.consecutive_losses = 0;
        this.tick_history = {};
        this.emit({ type: 'status', message: 'Starting engine...' });
        this.emit({ type: 'pnl', total: 0 });

        try {
            await this.loadPipSizes();
            await this.subscribeToTicks();
            this.subscribeToContracts();
            this.emit({ type: 'status', message: 'Scanning markets...' });
        } catch (err: any) {
            this.emit({ type: 'error', message: err?.message || 'Failed to start' });
            this.stop('error');
        }
    }

    private async loadPipSizes() {
        try {
            const res: any = await api_base.api.send({ active_symbols: 'brief' });
            const symbols = res?.active_symbols || [];
            symbols.forEach((s: any) => {
                this.pip_sizes[s.symbol] = s.pip ? Math.max(0, -Math.log10(s.pip)) : 2;
            });
        } catch {
            /* fall back to default pip size */
        }
        this.config.symbols.forEach(sym => {
            if (this.pip_sizes[sym] === undefined) this.pip_sizes[sym] = 2;
        });
    }

    private async subscribeToTicks() {
        for (const symbol of this.config.symbols) {
            this.tick_history[symbol] = [];
            const sub = api_base.api
                .subscribe({ ticks: symbol, subscribe: 1 })
                .subscribe((data: any) => {
                    if (!this.is_running) return;
                    const quote = Number(data?.tick?.quote);
                    if (!Number.isFinite(quote)) return;
                    const arr = this.tick_history[symbol];
                    arr.push(quote);
                    if (arr.length > 50) arr.shift();
                    this.evaluate(symbol);
                });
            this.subscriptions.set(symbol, sub);
        }
    }

    private subscribeToContracts() {
        // The existing api_base already subscribes to proposal_open_contract
        // and forwards events to the transactions store. We listen to the same
        // stream to compute realized PnL for our own engine.
        this.contract_subscription = api_base.api
            .subscribe({ proposal_open_contract: 1, subscribe: 1 })
            .subscribe((data: any) => {
                const c = data?.proposal_open_contract;
                if (!c?.contract_id) return;
                if (!this.open_contracts.has(c.contract_id)) return;
                if (c.is_sold && !this.settled_contracts.has(c.contract_id)) {
                    this.settled_contracts.add(c.contract_id);
                    const profit = Number(c.profit) || 0;
                    this.total_pnl += profit;
                    this.emit({ type: 'pnl', total: this.total_pnl });
                    if (profit < 0) {
                        this.consecutive_losses += 1;
                        if (this.config.martingale_enabled) {
                            this.current_stake = Math.round(
                                this.current_stake * Math.max(1, this.config.martingale_multiplier) * 100
                            ) / 100;
                        }
                    } else {
                        this.consecutive_losses = 0;
                        this.current_stake = this.config.stake;
                    }
                    this.checkLimits();
                }
            });
    }

    private checkLimits() {
        if (this.config.target_profit > 0 && this.total_pnl >= this.config.target_profit) {
            this.stop('target_profit');
        } else if (this.config.stop_loss > 0 && this.total_pnl <= -Math.abs(this.config.stop_loss)) {
            this.stop('stop_loss');
        }
    }

    private digitsOf(symbol: string, n: number): number[] {
        const arr = this.tick_history[symbol] || [];
        const pip = this.pip_sizes[symbol] ?? 2;
        const slice = arr.slice(-n);
        return slice.map(q => lastDigit(q, pip));
    }

    private digitFilterPasses(symbol: string): boolean {
        if (!this.config.digit_filter_enabled) return true;
        const n = this.config.digit_filter_last_n;
        const target = this.config.digit_filter_target;
        const arr = this.tick_history[symbol] || [];
        if (arr.length < n) return false;
        const digits = this.digitsOf(symbol, n);
        return digits.every(d => d === target);
    }

    private evaluate(symbol: string) {
        if (!this.is_running) return;
        if (this.in_flight.has(symbol)) return;
        const ticks = this.tick_history[symbol] || [];
        if (ticks.length < 2) return;

        // Hedging strategy
        if (this.config.hedge_enabled && this.digitFilterPasses(symbol)) {
            this.in_flight.add(symbol);
            this.placeHedge(symbol).finally(() => {
                setTimeout(() => this.in_flight.delete(symbol), 2000);
            });
            return;
        }

        // Multi-strategy builder
        for (const strat of this.config.strategies) {
            if (this.matchesStrategy(symbol, strat)) {
                this.in_flight.add(symbol);
                this.placeStrategyTrade(symbol, strat).finally(() => {
                    setTimeout(() => this.in_flight.delete(symbol), 2000);
                });
                return;
            }
        }
    }

    private matchesStrategy(symbol: string, strat: TStrategy): boolean {
        const arr = this.tick_history[symbol] || [];
        if (arr.length < strat.last_n + 1) return false;
        const digits = this.digitsOf(symbol, strat.last_n);
        const checkDigit = (d: number) => {
            switch (strat.condition) {
                case 'odd':
                    return d % 2 === 1;
                case 'even':
                    return d % 2 === 0;
                case 'over':
                    return d > (strat.over_under_value ?? 5);
                case 'under':
                    return d < (strat.over_under_value ?? 4);
                default:
                    return true;
            }
        };
        if (strat.condition === 'rise' || strat.condition === 'fall') {
            const slice = arr.slice(-(strat.last_n + 1));
            for (let i = 1; i < slice.length; i += 1) {
                if (strat.condition === 'rise' && slice[i] <= slice[i - 1]) return false;
                if (strat.condition === 'fall' && slice[i] >= slice[i - 1]) return false;
            }
            return true;
        }
        return digits.every(checkDigit);
    }

    private async placeHedge(symbol: string) {
        const stake = this.current_stake;
        await Promise.all([
            this.buy(symbol, 'DIGITOVER', stake, { barrier: '5' }),
            this.buy(symbol, 'DIGITUNDER', stake, { barrier: '4' }),
        ]);
    }

    private async placeStrategyTrade(symbol: string, strat: TStrategy) {
        const stake = this.current_stake;
        const action = strat.action;
        switch (action) {
            case 'odd':
                return this.buy(symbol, 'DIGITODD', stake);
            case 'even':
                return this.buy(symbol, 'DIGITEVEN', stake);
            case 'over':
                return this.buy(symbol, 'DIGITOVER', stake, {
                    barrier: String(strat.over_under_value ?? 5),
                });
            case 'under':
                return this.buy(symbol, 'DIGITUNDER', stake, {
                    barrier: String(strat.over_under_value ?? 4),
                });
            case 'rise':
                return this.buy(symbol, 'CALL', stake);
            case 'fall':
                return this.buy(symbol, 'PUT', stake);
        }
    }

    private async buy(
        symbol: string,
        contract_type: string,
        stake: number,
        extra: Record<string, any> = {}
    ) {
        try {
            const isDigit = contract_type.startsWith('DIGIT');
            const proposalReq: Record<string, any> = {
                proposal: 1,
                amount: stake,
                basis: 'stake',
                contract_type,
                currency: api_base.account_info?.currency || 'USD',
                duration: isDigit ? 1 : 5,
                duration_unit: 't',
                symbol,
                ...extra,
            };
            const res: any = await api_base.api.send(proposalReq);
            const proposal = res?.proposal;
            if (!proposal?.id) return;
            const buyRes: any = await api_base.api.send({
                buy: proposal.id,
                price: proposal.ask_price,
            });
            const contract_id = buyRes?.buy?.contract_id;
            if (contract_id) {
                this.open_contracts.add(contract_id);
                this.emit({ type: 'trade', symbol, contract_type, stake });
            }
        } catch (err: any) {
            this.emit({
                type: 'error',
                message: err?.error?.message || err?.message || 'Trade failed',
            });
        }
    }

    stop(reason: string = 'manual') {
        if (!this.is_running) return;
        this.is_running = false;
        this.subscriptions.forEach(sub => {
            try {
                sub.unsubscribe?.();
            } catch {
                /* noop */
            }
        });
        this.subscriptions.clear();
        try {
            this.contract_subscription?.unsubscribe?.();
        } catch {
            /* noop */
        }
        this.contract_subscription = null;
        const reasonText: Record<string, string> = {
            target_profit: 'Target profit reached',
            stop_loss: 'Stop loss reached',
            manual: 'Stopped by user',
            error: 'Stopped due to error',
        };
        this.emit({ type: 'status', message: reasonText[reason] || 'Stopped' });
        this.emit({ type: 'stopped', reason });
    }
}
