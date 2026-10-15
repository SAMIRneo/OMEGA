export type Timeframe='5m'|'15m'|'30m'|'1h'|'4h'|'1d'|'1w';
export type Side='long'|'short';
export interface Candle {t:number;T:number;o:string|number;h:string|number;l:string|number;c:string|number;v:string|number}
export interface Indicator {ready:boolean;lastClosedTime?:number;close?:number;previousClose?:number;ema20?:number;ema50?:number;ema200?:number|null;previousEma20?:number;previousEma50?:number;rsi?:number;atr?:number;histogram?:number;relativeVolume?:number;rollingVwap?:number|null;trend?:'bullish'|'bearish'|'neutral';support?:number;resistance?:number}
export interface Limits {paper_capital?:number;leverage:number;max_margin:number;max_risk:number;daily_loss_limit:number;fee_bps:number;slippage_bps:number;allocation_fraction:number;daily_mode:boolean;max_entries_per_day:number;max_leverage:number}
export interface Position {side:Side;entry:number;quantity:number;stop:number;target:number;margin:number;leverage:number;openedAt:number;entryFee:number}
export interface Paper {initial:number;cash:number;equity:number;unrealized:number;position:Position|null;history:Array<{netPnl:number;entry:number;exit:number;side:Side;at?:string;closedAt?:number;reason:string}>;day:string;dailyPnl:number;entriesToday:number;lastEntryDay?:string}
export interface Snapshot {time:number;runtime:'browser'|'local';market:{fresh:boolean;mid:number|null;sourceAgeSeconds:number|null;book:{time:number;levels:[Array<{px:string;sz:string}>,Array<{px:string;sz:string}>]}|null};context:{funding?:string;maxLeverage?:number;updatedAt?:number};limits:Limits;paper:Paper;account?:unknown;accountTime?:number;indicators:Partial<Record<Timeframe,Indicator>>;candleStatus:Partial<Record<Timeframe,{fetchedAt:number;error?:string|null}>>;candlesByTimeframe:Partial<Record<Timeframe,Candle[]>>}
export interface TradeIntent {side:Side;margin:number;stop:number;target:number;leverage?:number;strategy?:string;signalTime?:number}
export interface Candidate {side:Side;leverage:number;family:'breakout'|'pullback';score:number;reasons:string[];entry:number;stop:number;target:number;margin:number;quantity:number;plannedLoss:number;rewardRisk:number;impactBps:number}
export interface Evaluation {status:'wait'|'blocked'|'eligible';reasons:string[];candidate:Candidate|null;day:string;dailyBias:string}
export interface RustRisk {planned_loss(direction:number,entry:number,stop:number,quantity:number,fee:number,slip:number):number;size_margin(...args:number[]):number; risk_version():number}
export interface ControllerEvent {at:number;kind:string;message:string}
