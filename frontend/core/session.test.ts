import {it,expect} from 'vitest';
import {sessionBlock} from './session.js';
import {evaluateDaily} from './daily';
import {sample,risk} from './test-fixtures';
import {reservedAttempts,validateSettings} from '../../runner/policy';
it('permits a second opportunity but stops at the fourth attempt',()=>{
 const s=sample();s.paper.lastEntryDay=s.paper.day;s.paper.entriesToday=1;s.paper.lastEntryAt=s.time-1800;
 expect(evaluateDaily(s,risk).status).toBe('eligible');s.paper.entriesToday=4;expect(sessionBlock(s.paper,s.limits,s.time)).toMatch(/Quota/);
});
it('blocks during cooldown after either an entry or exit, including across midnight',()=>{
 const s=sample();s.paper.lastExitAt=s.time-1799;expect(sessionBlock(s.paper,s.limits,s.time)).toMatch(/Pause/);
 s.paper.lastExitAt=s.time-1800;expect(sessionBlock(s.paper,s.limits,s.time)).toBeNull();s.paper.lastEntryAt=s.time-60;s.paper.day='2026-10-13';expect(sessionBlock(s.paper,s.limits,s.time)).toMatch(/Pause/);
});
it('stops at a realized target, daily loss or two consecutive losses without resizing to chase a target',()=>{
 const s=sample();s.paper.dailyPnl=200;expect(evaluateDaily(s,risk).reasons[0]).toMatch(/Objectif/);
 s.paper.dailyPnl=0;s.paper.lossStreak=2;expect(evaluateDaily(s,risk).reasons[0]).toMatch(/Deux pertes/);
 s.paper.lossStreak=0;s.paper.dailyPnl=-500;expect(evaluateDaily(s,risk).reasons[0]).toMatch(/perte quotidienne/);
 s.paper.dailyPnl=-480;const c=evaluateDaily(s,risk).candidate!;expect(c.plannedLoss).toBeLessThanOrEqual(18.001);
});
it('rejects unknown session targets and future timestamps',()=>{
 const s=sample();s.limits.daily_profit_target=Infinity;expect(evaluateDaily(s,risk).status).toBe('blocked');
 s.limits.daily_profit_target=200;s.paper.lastEntryAt=s.time+10;expect(evaluateDaily(s,risk).reasons[0]).toMatch(/Horodatage/);
 expect(()=>validateSettings({profile:'balanced',leverage:15,dailyTarget:999})).toThrow();
});
it('retains a legacy durable reservation, validates counters and resets only on another UTC day',()=>{
 expect(reservedAttempts({attemptDay:'2026-10-14'},'2026-10-14')).toBe(1);
 expect(reservedAttempts({attemptDay:'2026-10-14',attemptCount:3},'2026-10-14')).toBe(3);
 expect(reservedAttempts({attemptDay:'2026-10-14',attemptCount:4},'2026-10-15')).toBe(0);
 expect(()=>reservedAttempts({attemptDay:'2026-10-14',attemptCount:0},'2026-10-14')).toThrow();
});
it('filters weak regimes, volatility shocks and overstretched signals',()=>{
 const s=sample();s.indicators['15m']!.adx=12;expect(evaluateDaily(s,risk).reasons[0]).toMatch(/Tendance trop faible/);
 s.indicators['15m']!.adx=25;s.indicators['15m']!.atr=70;expect(evaluateDaily(s,risk).reasons[0]).toMatch(/Volatilité/);
 s.indicators['15m']!.atr=10;s.indicators['15m']!.close=2530;expect(evaluateDaily(s,risk).reasons[0]).toMatch(/Mouvement trop avancé/);
});
