import {it,expect} from 'vitest';
import {networkConfig,networkDefinition,assertEnvironment} from './networks.js';
import {bindLedgerNetwork,assertDistinctAgents} from '../../shared/policy';
it.each(['mainnet','testnet'] as const)('pins %s REST, WS and signatures to one immutable definition',network=>{
 const n=networkDefinition(network),config=networkConfig(network);
 expect(config.apiUrl).toBe(network==='mainnet'?'https://api.hyperliquid.xyz':'https://api.hyperliquid-testnet.xyz');
 expect(config.isTestnet).toBe(network==='testnet');expect(n.ws).toBe(config.apiUrl.replace('https:','wss:')+'/ws');expect(Object.isFrozen(n)).toBe(true);
 expect(assertEnvironment({id:network,api:config.apiUrl+'/info',ws:n.ws})).toBe(n);
 expect(()=>assertEnvironment({id:network,api:networkConfig(network==='mainnet'?'testnet':'mainnet').apiUrl+'/info'})).toThrow('Endpoints');
});
it('rejects absent, unknown or malformed networks without a signing fallback',()=>{
 for(const value of [undefined,null,'MAINNET','other','',{},'testnet?mainnet'])expect(()=>networkConfig(value)).toThrow();
 expect(()=>assertEnvironment(undefined)).toThrow();
});
it('binds legacy ledgers without resetting state and refuses cross-network files or shared agents',()=>{
 const ledger:{network?:string;attemptDay:string;attemptCount:number}={attemptDay:'2026-10-17',attemptCount:2};bindLedgerNetwork(ledger,'testnet');expect(ledger).toMatchObject({network:'testnet',attemptCount:2});
 expect(()=>bindLedgerNetwork(ledger,'mainnet')).toThrow('autre réseau');
 expect(()=>assertDistinctAgents('0xAbC','0xabc')).toThrow('distinct');expect(()=>assertDistinctAgents('0x111','0x222')).not.toThrow();
});
