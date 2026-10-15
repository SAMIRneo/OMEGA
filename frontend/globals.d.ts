import type {Snapshot,RustRisk,TradeIntent,Candle,Timeframe} from './core/types';
import type {controller} from './core/controller';
declare global {interface Window {
 RiskCore:{exports:RustRisk|null;ready:Promise<RustRisk|null>;error:Error|null};
 PaperPilot:typeof controller;
 TestnetGate?:()=>Promise<void>;
 BrowserAtelier:{environment?:{id:string;label?:string;api:string;ws?:string};request(path:string,options?:{method?:string;body?:string}):Promise<Snapshot|unknown>;setAddress(value:string,remember?:boolean):Promise<void>;disconnect():void|Promise<unknown>};
 TradingChart:{render(raw:Candle[],timeframe:Timeframe,mode:'candles'|'line',count:number):void;resize():void};
 }}
export {};
