import {describe,it,expect} from 'vitest';
import {evaluateDaily} from './daily';
import {sample,risk} from './test-fixtures';
import {features} from './indicators';
describe('Strategy confluence and reactivity',()=>{
 it('allows an early MACD crossing only in offensive mode with confirmations',()=>{
  const s=sample(),f=s.indicators['15m']!;
  Object.assign(f,{previousClose:2504,resistance:2600,previousHistogram:-.1,cmf:.15,obvChange20:200,adx:26,plusDI:30,minusDI:12});
  expect(evaluateDaily(s,risk).status).toBe('wait');
  s.limits.strategy_profile='aggressive';
  const e=evaluateDaily(s,risk);expect(e.candidate?.family).toBe('momentum');expect(e.candidate!.plannedLoss).toBeLessThanOrEqual(450);
  f.cmf=-.15;f.obvChange20=-200;f.adx=10;f.relativeVolume=.8;
  expect(evaluateDaily(s,risk).status).toBe('wait');
 });
 it('requires stronger confluence in selective mode',()=>{
  const s=sample();s.limits.strategy_profile='selective';s.indicators['15m']!.relativeVolume=1.2;
  expect(evaluateDaily(s,risk).status).toBe('wait');
  Object.assign(s.indicators['15m']!,{relativeVolume:1.5,cmf:.1,obvChange20:100,adx:28,plusDI:30,minusDI:12});
  expect(evaluateDaily(s,risk).status).toBe('eligible');
 });
 it.each(['balanced','selective','aggressive'] as const)('retains quota, freshness and context guards for %s',profile=>{
  const s=sample();s.limits.strategy_profile=profile;s.market.fresh=false;expect(evaluateDaily(s,risk).status).toBe('blocked');
  s.market.fresh=true;s.indicators['1h']!.trend='bearish';expect(evaluateDaily(s,risk).status).toBe('wait');
  s.paper.entriesToday=4;s.paper.lastEntryDay='2026-10-14';expect(evaluateDaily(s,risk).status).toBe('blocked');
 });
 it('ignores open bars and keeps flat-market confirmations finite and neutral',()=>{
  const bars=Array.from({length:80},(_,i)=>({t:i*1000,T:i*1000+999,o:100,h:100,l:100,c:100,v:0}));
  const before=features(bars,80000);bars.push({t:80000,T:80999,o:100,h:9999,l:1,c:9999,v:99999});
  expect(features(bars,80000)).toEqual(before);
  expect(before).toMatchObject({adx:0,plusDI:0,minusDI:0,cmf:0,obvChange20:0,bbWidth:0});
 });
});
