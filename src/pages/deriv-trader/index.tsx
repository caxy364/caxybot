import React, { useEffect, useRef, useState } from 'react';
import { observer as obs } from 'mobx-react-lite';
import {
    SmartHedgingEngine,
    VOLATILITY_SYMBOLS,
    type TBotConfig,
    type TMartingaleMode,
    type TStrategy,
    type TVolatilitySymbol,
} from './engine';
import './deriv-trader.scss';

const STRATEGY_CONDITIONS = ['odd', 'even', 'over', 'under', 'rise', 'fall'] as const;
const STRATEGY_ACTIONS = ['odd', 'even', 'over', 'under', 'rise', 'fall'] as const;

const newId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

type TStats = {
    status: string;
    pnl: number;
    trades: number;
    error: string;
    running: boolean;
};

const initialStats: TStats = {
    status: 'Idle',
    pnl: 0,
    trades: 0,
    error: '',
    running: false,
};

const PnlPill: React.FC<{ value: number }> = ({ value }) => {
    const cls = value > 0 ? 'sf-pnl sf-pnl--pos' : value < 0 ? 'sf-pnl sf-pnl--neg' : 'sf-pnl';
    return <span className={cls}>{value.toFixed(2)}</span>;
};

const StatsBar: React.FC<{ stats: TStats }> = ({ stats }) => (
    <div className='sf-stats'>
        <div className='sf-stat'>
            <span className='sf-stat__label'>Status</span>
            <span className='sf-stat__value'>{stats.status}</span>
        </div>
        <div className='sf-stat'>
            <span className='sf-stat__label'>Trades</span>
            <span className='sf-stat__value'>{stats.trades}</span>
        </div>
        <div className='sf-stat'>
            <span className='sf-stat__label'>Net P/L</span>
            <PnlPill value={stats.pnl} />
        </div>
    </div>
);

const useEngineStats = () => {
    const [stats, setStats] = useState<TStats>(initialStats);
    const engine_ref = useRef<SmartHedgingEngine | null>(null);

    const start = (config: TBotConfig) => {
        setStats({ ...initialStats, running: true, status: 'Starting...' });
        const engine = new SmartHedgingEngine(config);
        engine.on(evt => {
            setStats(prev => {
                const next = { ...prev };
                if (evt.type === 'status') next.status = evt.message;
                if (evt.type === 'pnl') next.pnl = evt.total;
                if (evt.type === 'trade') next.trades = prev.trades + 1;
                if (evt.type === 'error') next.error = evt.message;
                if (evt.type === 'stopped') next.running = false;
                return next;
            });
        });
        engine_ref.current = engine;
        engine.start();
    };

    const stop = () => {
        engine_ref.current?.stop('manual');
        setStats(prev => ({ ...prev, running: false, status: 'Stopped by user' }));
    };

    useEffect(() => {
        return () => {
            engine_ref.current?.stop('manual');
        };
    }, []);

    return { stats, start, stop, setError: (e: string) => setStats(s => ({ ...s, error: e })) };
};

/* -------------------------------------------------------------------------- */
/*                              Hedging Section                               */
/* -------------------------------------------------------------------------- */

const HedgingSection: React.FC = () => {
    const [stake, setStake] = useState<number>(1);
    const [tp, setTp] = useState<number>(100);
    const [sl, setSl] = useState<number>(100);
    const [multiplier, setMultiplier] = useState<number>(2.1);
    const [martingale_mode, setMartingaleMode] = useState<TMartingaleMode>('both_lose');
    const [digit_filter_enabled, setDigitFilterEnabled] = useState<boolean>(false);
    const [digit_n, setDigitN] = useState<number>(4);
    const [digit_target, setDigitTarget] = useState<4 | 5>(5);
    const [selected, setSelected] = useState<TVolatilitySymbol[]>([
        '1HZ15V',
        '1HZ30V',
        '1HZ90V',
    ]);
    const { stats, start, stop, setError } = useEngineStats();

    const toggle = (s: TVolatilitySymbol) => {
        if (stats.running) return;
        setSelected(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
    };

    const handleRun = () => {
        if (selected.length === 0) {
            setError('Pick at least one volatility market.');
            return;
        }
        setError('');
        start({
            mode: 'hedging',
            stake,
            target_profit: tp,
            stop_loss: sl,
            martingale_enabled: true,
            martingale_multiplier: multiplier,
            martingale_mode,
            digit_filter_enabled,
            digit_filter_last_n: digit_n,
            digit_filter_target: digit_target,
            strategies: [],
            symbols: selected,
        });
    };

    return (
        <section className='sf-card'>
            <div className='sf-card__head-row'>
                <div>
                    <h3 className='sf-card__title'>Hedging Engine</h3>
                    <p className='sf-card__hint'>
                        Places DIGIT OVER 5 + DIGIT UNDER 4 simultaneously on every selected
                        market.
                    </p>
                </div>
                <StatsBar stats={stats} />
            </div>

            {stats.error ? <div className='sf-error'>{stats.error}</div> : null}

            <div className='sf-form sf-form--four'>
                <label className='sf-field'>
                    <span>Stake (USD)</span>
                    <input
                        type='number'
                        min={0.35}
                        step={0.1}
                        value={stake}
                        disabled={stats.running}
                        onChange={e => setStake(Number(e.target.value))}
                    />
                </label>
                <label className='sf-field'>
                    <span>Target Profit</span>
                    <input
                        type='number'
                        min={0}
                        value={tp}
                        disabled={stats.running}
                        onChange={e => setTp(Number(e.target.value))}
                    />
                </label>
                <label className='sf-field'>
                    <span>Stop Loss</span>
                    <input
                        type='number'
                        min={0}
                        value={sl}
                        disabled={stats.running}
                        onChange={e => setSl(Number(e.target.value))}
                    />
                </label>
                <label className='sf-field'>
                    <span>Multiplier</span>
                    <input
                        type='number'
                        min={1}
                        step={0.1}
                        value={multiplier}
                        disabled={stats.running}
                        onChange={e => setMultiplier(Number(e.target.value))}
                    />
                </label>
            </div>

            <div className='sf-form sf-form--two'>
                <label className='sf-field'>
                    <span>Digits to Check</span>
                    <select
                        value={digit_filter_enabled ? digit_n : 0}
                        disabled={stats.running}
                        onChange={e => {
                            const v = Number(e.target.value);
                            if (v === 0) setDigitFilterEnabled(false);
                            else {
                                setDigitFilterEnabled(true);
                                setDigitN(v);
                            }
                        }}
                    >
                        <option value={0}>Off</option>
                        <option value={2}>Last 2 digits</option>
                        <option value={3}>Last 3 digits</option>
                        <option value={4}>Last 4 digits</option>
                        <option value={5}>Last 5 digits</option>
                    </select>
                </label>
                <label className='sf-field'>
                    <span>Martingale Mode</span>
                    <select
                        value={martingale_mode}
                        disabled={stats.running}
                        onChange={e => setMartingaleMode(e.target.value as TMartingaleMode)}
                    >
                        <option value='both_lose'>When BOTH lose</option>
                        <option value='any_loss'>On any loss</option>
                    </select>
                </label>
                {digit_filter_enabled && (
                    <label className='sf-field'>
                        <span>Target Digit</span>
                        <select
                            value={digit_target}
                            disabled={stats.running}
                            onChange={e => setDigitTarget(Number(e.target.value) as 4 | 5)}
                        >
                            <option value={4}>4</option>
                            <option value={5}>5</option>
                        </select>
                    </label>
                )}
            </div>

            <div className='sf-actions sf-actions--center'>
                {stats.running ? (
                    <button className='sf-btn sf-btn--stop sf-btn--big' onClick={stop} type='button'>
                        ■ Stop
                    </button>
                ) : (
                    <button
                        className='sf-btn sf-btn--run sf-btn--big'
                        onClick={handleRun}
                        type='button'
                    >
                        ▶ Execute Trades
                    </button>
                )}
            </div>

            <div className='sf-market-grid'>
                {VOLATILITY_SYMBOLS.map(s => {
                    const active = selected.includes(s.code);
                    return (
                        <button
                            key={s.code}
                            type='button'
                            disabled={stats.running}
                            onClick={() => toggle(s.code)}
                            className={`sf-market ${active ? 'sf-market--active' : ''}`}
                        >
                            {s.label}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

/* -------------------------------------------------------------------------- */
/*                            Strategy Section                                */
/* -------------------------------------------------------------------------- */

const StrategySection: React.FC = () => {
    const [stake, setStake] = useState<number>(10);
    const [tp, setTp] = useState<number>(100);
    const [sl, setSl] = useState<number>(100);
    const [martingale_enabled, setMartingaleEnabled] = useState<boolean>(true);
    const [multiplier, setMultiplier] = useState<number>(2.1);
    const [strategies, setStrategies] = useState<TStrategy[]>([
        { id: newId(), last_n: 4, condition: 'odd', action: 'even' },
    ]);
    const [selected, setSelected] = useState<TVolatilitySymbol[]>(['1HZ15V', '1HZ30V', '1HZ90V']);
    const { stats, start, stop, setError } = useEngineStats();

    const toggle = (s: TVolatilitySymbol) => {
        if (stats.running) return;
        setSelected(prev => (prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]));
    };

    const addStrategy = () => {
        setStrategies(prev => [
            ...prev,
            { id: newId(), last_n: 3, condition: 'even', action: 'even', over_under_value: 5 },
        ]);
    };

    const updateStrategy = (id: string, patch: Partial<TStrategy>) => {
        setStrategies(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
    };

    const removeStrategy = (id: string) => {
        setStrategies(prev => prev.filter(s => s.id !== id));
    };

    const handleRun = () => {
        if (strategies.length === 0) {
            setError('Add at least one strategy.');
            return;
        }
        if (selected.length === 0) {
            setError('Pick at least one volatility market.');
            return;
        }
        setError('');
        start({
            mode: 'strategies',
            stake,
            target_profit: tp,
            stop_loss: sl,
            martingale_enabled,
            martingale_multiplier: multiplier,
            digit_filter_enabled: false,
            digit_filter_last_n: 0,
            digit_filter_target: 5,
            strategies,
            symbols: selected,
        });
    };

    return (
        <section className='sf-card'>
            <div className='sf-card__head-row'>
                <div>
                    <h3 className='sf-card__title'>Strategy Builder</h3>
                    <p className='sf-card__hint'>
                        Multi-Strategy bot — runs up to 5 strategies at once. Example: <em>If the
                        last 4 digits are ODD, trade EVEN.</em> Rise/Fall use market moves; other
                        contracts use last digits.
                    </p>
                </div>
                <StatsBar stats={stats} />
            </div>

            {stats.error ? <div className='sf-error'>{stats.error}</div> : null}

            <div className='sf-form sf-form--four'>
                <label className='sf-field'>
                    <span>Stake (USD)</span>
                    <input
                        type='number'
                        min={0.35}
                        step={0.1}
                        value={stake}
                        disabled={stats.running}
                        onChange={e => setStake(Number(e.target.value))}
                    />
                </label>
                <label className='sf-field'>
                    <span>Target Profit</span>
                    <input
                        type='number'
                        min={0}
                        value={tp}
                        disabled={stats.running}
                        onChange={e => setTp(Number(e.target.value))}
                    />
                </label>
                <label className='sf-field'>
                    <span>Stop Loss</span>
                    <input
                        type='number'
                        min={0}
                        value={sl}
                        disabled={stats.running}
                        onChange={e => setSl(Number(e.target.value))}
                    />
                </label>
                <label className='sf-field'>
                    <span>Martingale</span>
                    <input
                        type='number'
                        min={1}
                        step={0.1}
                        value={multiplier}
                        disabled={stats.running || !martingale_enabled}
                        onChange={e => setMultiplier(Number(e.target.value))}
                    />
                </label>
            </div>

            <label className='sf-field sf-field--toggle sf-field--inline'>
                <span>Enable Martingale</span>
                <input
                    type='checkbox'
                    checked={martingale_enabled}
                    disabled={stats.running}
                    onChange={e => setMartingaleEnabled(e.target.checked)}
                />
            </label>

            <div className='sf-strategies-head'>
                <strong>Strategies</strong>
                <button
                    className='sf-btn sf-btn--add'
                    onClick={addStrategy}
                    disabled={stats.running || strategies.length >= 5}
                    type='button'
                >
                    + Add Strategy
                </button>
            </div>

            {strategies.length === 0 ? (
                <p className='sf-empty'>No strategies yet. Add one to start.</p>
            ) : (
                <div className='sf-strategies'>
                    {strategies.map((s, idx) => (
                        <div key={s.id} className='sf-strategy'>
                            <div className='sf-strategy__header'>
                                <strong className='sf-strategy__title'>STRATEGY {idx + 1}</strong>
                                <button
                                    className='sf-btn sf-btn--ghost'
                                    onClick={() => removeStrategy(s.id)}
                                    disabled={stats.running}
                                    type='button'
                                >
                                    REMOVE
                                </button>
                            </div>
                            <div className='sf-strategy__row'>
                                <span>IF THE LAST</span>
                                <input
                                    type='number'
                                    min={1}
                                    max={7}
                                    value={s.last_n}
                                    disabled={stats.running}
                                    onChange={e =>
                                        updateStrategy(s.id, {
                                            last_n: Math.min(
                                                7,
                                                Math.max(1, Number(e.target.value))
                                            ),
                                        })
                                    }
                                />
                                <span>DIGITS / MOVES ARE</span>
                                <select
                                    value={s.condition}
                                    disabled={stats.running}
                                    onChange={e =>
                                        updateStrategy(s.id, {
                                            condition: e.target.value as TStrategy['condition'],
                                        })
                                    }
                                >
                                    {STRATEGY_CONDITIONS.map(c => (
                                        <option key={c} value={c}>
                                            {c.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                {(s.condition === 'over' || s.condition === 'under') && (
                                    <input
                                        type='number'
                                        min={0}
                                        max={9}
                                        value={s.over_under_value ?? 5}
                                        disabled={stats.running}
                                        onChange={e =>
                                            updateStrategy(s.id, {
                                                over_under_value: Number(e.target.value),
                                            })
                                        }
                                    />
                                )}
                            </div>
                            <div className='sf-strategy__row'>
                                <span>THEN TRADE</span>
                                <select
                                    value={s.action}
                                    disabled={stats.running}
                                    onChange={e =>
                                        updateStrategy(s.id, {
                                            action: e.target.value as TStrategy['action'],
                                        })
                                    }
                                >
                                    {STRATEGY_ACTIONS.map(a => (
                                        <option key={a} value={a}>
                                            {a.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className='sf-actions sf-actions--center'>
                {stats.running ? (
                    <button className='sf-btn sf-btn--stop sf-btn--big' onClick={stop} type='button'>
                        ■ Stop
                    </button>
                ) : (
                    <button
                        className='sf-btn sf-btn--run sf-btn--big'
                        onClick={handleRun}
                        type='button'
                    >
                        ▶ Execute Strategies
                    </button>
                )}
            </div>

            <div className='sf-market-grid'>
                {VOLATILITY_SYMBOLS.map(s => {
                    const active = selected.includes(s.code);
                    return (
                        <button
                            key={s.code}
                            type='button'
                            disabled={stats.running}
                            onClick={() => toggle(s.code)}
                            className={`sf-market ${active ? 'sf-market--active' : ''}`}
                        >
                            {s.label}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

/* -------------------------------------------------------------------------- */
/*                                  Page                                      */
/* -------------------------------------------------------------------------- */

const SmartFortune: React.FC = obs(() => {
    return (
        <div className='smart-fortune'>
            <header className='sf-page-header'>
                <h2 className='sf-title'>Smart Fortune</h2>
                <p className='sf-subtitle'>
                    Two engines, one panel. Strategies runs your custom rules. Hedging fires
                    OVER 5 + UNDER 4 simultaneously. Every settled trade lands in the
                    Transactions panel of this app.
                </p>
            </header>

            <StrategySection />
            <HedgingSection />
        </div>
    );
});

export default SmartFortune;
