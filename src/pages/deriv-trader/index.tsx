import React, { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
    SmartHedgingEngine,
    VOLATILITY_SYMBOLS,
    type TBotConfig,
    type TStrategy,
    type TVolatilitySymbol,
} from './engine';
import './deriv-trader.scss';

const STRATEGY_CONDITIONS = ['odd', 'even', 'over', 'under', 'rise', 'fall'] as const;
const STRATEGY_ACTIONS = ['odd', 'even', 'over', 'under', 'rise', 'fall'] as const;

const newId = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const SmartFortune: React.FC = observer(() => {
    const [stake, setStake] = useState<number>(1);
    const [target_profit, setTargetProfit] = useState<number>(10);
    const [stop_loss, setStopLoss] = useState<number>(10);
    const [martingale_enabled, setMartingaleEnabled] = useState<boolean>(false);
    const [martingale_multiplier, setMartingaleMultiplier] = useState<number>(2);
    const [hedge_enabled, setHedgeEnabled] = useState<boolean>(true);
    const [digit_filter_enabled, setDigitFilterEnabled] = useState<boolean>(false);
    const [digit_filter_last_n, setDigitFilterLastN] = useState<number>(2);
    const [digit_filter_target, setDigitFilterTarget] = useState<4 | 5>(5);
    const [selected_symbols, setSelectedSymbols] = useState<TVolatilitySymbol[]>([
        '1HZ15V',
        '1HZ30V',
        '1HZ90V',
    ]);
    const [strategies, setStrategies] = useState<TStrategy[]>([]);
    const [is_running, setIsRunning] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('Idle');
    const [pnl, setPnl] = useState<number>(0);
    const [trade_count, setTradeCount] = useState<number>(0);
    const [error_msg, setErrorMsg] = useState<string>('');
    const engine_ref = useRef<SmartHedgingEngine | null>(null);

    useEffect(() => {
        return () => {
            engine_ref.current?.stop('manual');
        };
    }, []);

    const toggleSymbol = (sym: TVolatilitySymbol) => {
        setSelectedSymbols(prev =>
            prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
        );
    };

    const addStrategy = () => {
        setStrategies(prev => [
            ...prev,
            {
                id: newId(),
                last_n: 3,
                condition: 'even',
                action: 'even',
                over_under_value: 5,
            },
        ]);
    };

    const updateStrategy = (id: string, patch: Partial<TStrategy>) => {
        setStrategies(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
    };

    const removeStrategy = (id: string) => {
        setStrategies(prev => prev.filter(s => s.id !== id));
    };

    const handleStart = () => {
        if (selected_symbols.length === 0) {
            setErrorMsg('Pick at least one volatility market.');
            return;
        }
        setErrorMsg('');
        setPnl(0);
        setTradeCount(0);
        const cfg: TBotConfig = {
            stake,
            target_profit,
            stop_loss,
            martingale_enabled,
            martingale_multiplier,
            digit_filter_enabled,
            digit_filter_last_n,
            digit_filter_target,
            hedge_enabled,
            strategies,
            symbols: selected_symbols,
        };
        const engine = new SmartHedgingEngine(cfg);
        engine.on(evt => {
            if (evt.type === 'status') setStatus(evt.message);
            if (evt.type === 'pnl') setPnl(evt.total);
            if (evt.type === 'trade') setTradeCount(c => c + 1);
            if (evt.type === 'error') setErrorMsg(evt.message);
            if (evt.type === 'stopped') setIsRunning(false);
        });
        engine_ref.current = engine;
        setIsRunning(true);
        engine.start();
    };

    const handleStop = () => {
        engine_ref.current?.stop('manual');
        setIsRunning(false);
        setStatus('Stopped by user');
    };

    const pnl_class = useMemo(() => {
        if (pnl > 0) return 'sf-pnl sf-pnl--pos';
        if (pnl < 0) return 'sf-pnl sf-pnl--neg';
        return 'sf-pnl';
    }, [pnl]);

    return (
        <div className='smart-fortune'>
            <div className='sf-header'>
                <div>
                    <h2 className='sf-title'>Smart Fortune Engine</h2>
                    <p className='sf-subtitle'>
                        Multi-strategy hedging bot — scans Volatility 15, 30, 90 (1s) live and
                        pushes every settled trade into the Transactions panel below.
                    </p>
                </div>
                <div className='sf-stats'>
                    <div className='sf-stat'>
                        <span className='sf-stat__label'>Status</span>
                        <span className='sf-stat__value'>{status}</span>
                    </div>
                    <div className='sf-stat'>
                        <span className='sf-stat__label'>Trades</span>
                        <span className='sf-stat__value'>{trade_count}</span>
                    </div>
                    <div className='sf-stat'>
                        <span className='sf-stat__label'>Net P/L</span>
                        <span className={pnl_class}>{pnl.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {error_msg ? <div className='sf-error'>{error_msg}</div> : null}

            <div className='sf-grid'>
                <section className='sf-card'>
                    <h3 className='sf-card__title'>Control Panel</h3>
                    <div className='sf-form'>
                        <label className='sf-field'>
                            <span>Stake</span>
                            <input
                                type='number'
                                min={0.35}
                                step={0.1}
                                value={stake}
                                disabled={is_running}
                                onChange={e => setStake(Number(e.target.value))}
                            />
                        </label>
                        <label className='sf-field'>
                            <span>Target Profit</span>
                            <input
                                type='number'
                                min={0}
                                step={0.5}
                                value={target_profit}
                                disabled={is_running}
                                onChange={e => setTargetProfit(Number(e.target.value))}
                            />
                        </label>
                        <label className='sf-field'>
                            <span>Stop Loss</span>
                            <input
                                type='number'
                                min={0}
                                step={0.5}
                                value={stop_loss}
                                disabled={is_running}
                                onChange={e => setStopLoss(Number(e.target.value))}
                            />
                        </label>
                        <label className='sf-field sf-field--toggle'>
                            <span>Martingale</span>
                            <input
                                type='checkbox'
                                checked={martingale_enabled}
                                disabled={is_running}
                                onChange={e => setMartingaleEnabled(e.target.checked)}
                            />
                        </label>
                        <label className='sf-field'>
                            <span>Multiplier</span>
                            <input
                                type='number'
                                min={1}
                                step={0.1}
                                value={martingale_multiplier}
                                disabled={is_running || !martingale_enabled}
                                onChange={e => setMartingaleMultiplier(Number(e.target.value))}
                            />
                        </label>
                        <label className='sf-field sf-field--toggle'>
                            <span>Hedging (Over 5 + Under 4)</span>
                            <input
                                type='checkbox'
                                checked={hedge_enabled}
                                disabled={is_running}
                                onChange={e => setHedgeEnabled(e.target.checked)}
                            />
                        </label>
                    </div>

                    <div className='sf-actions'>
                        {is_running ? (
                            <button className='sf-btn sf-btn--stop' onClick={handleStop}>
                                Stop
                            </button>
                        ) : (
                            <button className='sf-btn sf-btn--run' onClick={handleStart}>
                                Run
                            </button>
                        )}
                    </div>
                </section>

                <section className='sf-card'>
                    <h3 className='sf-card__title'>Volatility Markets</h3>
                    <div className='sf-symbols'>
                        {VOLATILITY_SYMBOLS.map(s => {
                            const active = selected_symbols.includes(s.code);
                            return (
                                <button
                                    key={s.code}
                                    className={`sf-chip ${active ? 'sf-chip--active' : ''}`}
                                    onClick={() => toggleSymbol(s.code)}
                                    disabled={is_running}
                                    type='button'
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>

                    <h3 className='sf-card__title sf-card__title--mt'>Digit Filter</h3>
                    <div className='sf-form'>
                        <label className='sf-field sf-field--toggle'>
                            <span>Enable filter</span>
                            <input
                                type='checkbox'
                                checked={digit_filter_enabled}
                                disabled={is_running}
                                onChange={e => setDigitFilterEnabled(e.target.checked)}
                            />
                        </label>
                        <label className='sf-field'>
                            <span>Check last</span>
                            <select
                                value={digit_filter_last_n}
                                disabled={is_running || !digit_filter_enabled}
                                onChange={e => setDigitFilterLastN(Number(e.target.value))}
                            >
                                <option value={2}>2 digits</option>
                                <option value={3}>3 digits</option>
                                <option value={4}>4 digits</option>
                                <option value={5}>5 digits</option>
                            </select>
                        </label>
                        <label className='sf-field'>
                            <span>Target digit</span>
                            <select
                                value={digit_filter_target}
                                disabled={is_running || !digit_filter_enabled}
                                onChange={e =>
                                    setDigitFilterTarget(Number(e.target.value) as 4 | 5)
                                }
                            >
                                <option value={4}>4</option>
                                <option value={5}>5</option>
                            </select>
                        </label>
                    </div>
                </section>

                <section className='sf-card sf-card--full'>
                    <div className='sf-card__head-row'>
                        <h3 className='sf-card__title'>Strategy Builder</h3>
                        <button
                            className='sf-btn sf-btn--add'
                            onClick={addStrategy}
                            disabled={is_running}
                            type='button'
                        >
                            + Add Strategy
                        </button>
                    </div>
                    {strategies.length === 0 ? (
                        <p className='sf-empty'>No custom strategies. Hedging will run alone.</p>
                    ) : (
                        <div className='sf-strategies'>
                            {strategies.map((s, idx) => (
                                <div key={s.id} className='sf-strategy'>
                                    <div className='sf-strategy__header'>
                                        <strong>Strategy {idx + 1}</strong>
                                        <button
                                            className='sf-btn sf-btn--ghost'
                                            onClick={() => removeStrategy(s.id)}
                                            disabled={is_running}
                                            type='button'
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <div className='sf-strategy__row'>
                                        <span>IF last</span>
                                        <input
                                            type='number'
                                            min={1}
                                            max={7}
                                            value={s.last_n}
                                            disabled={is_running}
                                            onChange={e =>
                                                updateStrategy(s.id, {
                                                    last_n: Math.min(
                                                        7,
                                                        Math.max(1, Number(e.target.value))
                                                    ),
                                                })
                                            }
                                        />
                                        <span>digits are</span>
                                        <select
                                            value={s.condition}
                                            disabled={is_running}
                                            onChange={e =>
                                                updateStrategy(s.id, {
                                                    condition: e.target.value as TStrategy['condition'],
                                                })
                                            }
                                        >
                                            {STRATEGY_CONDITIONS.map(c => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                        {(s.condition === 'over' || s.condition === 'under') && (
                                            <input
                                                type='number'
                                                min={0}
                                                max={9}
                                                value={s.over_under_value ?? 5}
                                                disabled={is_running}
                                                onChange={e =>
                                                    updateStrategy(s.id, {
                                                        over_under_value: Number(e.target.value),
                                                    })
                                                }
                                            />
                                        )}
                                    </div>
                                    <div className='sf-strategy__row'>
                                        <span>THEN trade</span>
                                        <select
                                            value={s.action}
                                            disabled={is_running}
                                            onChange={e =>
                                                updateStrategy(s.id, {
                                                    action: e.target.value as TStrategy['action'],
                                                })
                                            }
                                        >
                                            {STRATEGY_ACTIONS.map(a => (
                                                <option key={a} value={a}>
                                                    {a}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <p className='sf-note'>
                Trades placed by Smart Fortune appear automatically in the existing Transactions
                panel. Make sure you are logged in to your Deriv account before running.
            </p>
        </div>
    );
});

export default SmartFortune;
