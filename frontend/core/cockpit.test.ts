import {it,expect} from 'vitest';
import {sample} from './test-fixtures';
import {cockpitModel} from './cockpit';
it('separates simulated capital from an unread or stale exchange account',()=>{
 const s=sample();expect(cockpitModel(s,'paper',7).equity).toBe(10000);expect(cockpitModel(s,'account',7).equity).toBeNull();
 s.account={perpetuals:{marginSummary:{accountValue:'120',totalMarginUsed:'30'},assetPositions:[]}};s.accountTime=s.time;
 expect(cockpitModel(s,'account',7)).toMatchObject({equity:120,exposure:25,points:[],pnl:null});
 s.accountTime=s.time-76;expect(cockpitModel(s,'account',7)).toMatchObject({equity:null,positions:[]});
});
it('uses the capital before the selected period and never fabricates performance',()=>{
 const s=sample();s.paper.history=[{netPnl:100,closedAt:(s.time-10*86400)*1000,side:'long',entry:1,exit:2,reason:'test'},{netPnl:-50,closedAt:(s.time-86400)*1000,side:'long',entry:2,exit:1,reason:'test'}];s.paper.equity=10050;
 expect(cockpitModel(s,'paper',7)).toMatchObject({pnl:-50,closed:1});expect(cockpitModel(s,'paper',null).pnl).toBe(50);
 const empty=cockpitModel(sample(),'paper',7);expect(empty.pnl).toBe(0);expect(empty.closed).toBe(0);expect(empty.points.every(p=>p.value===10000)).toBe(true);
});
