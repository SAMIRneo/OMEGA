import copy
import json
import math
import time
import unittest
from analysis import features
from multiframe import TIMEFRAMES, confluence
from research import compare_strategies
from engine import ROOT

def bars(count=600):
    return [{'t':i*300000,'T':(i+1)*300000-1,'o':str(100+math.sin(i/9)*5),'h':str(102+math.sin(i/9)*5),'l':str(98+math.sin(i/9)*5),'c':str(100+math.sin((i+.5)/9)*5),'v':str(10+i%8)} for i in range(count)]

class MultiFrameTests(unittest.TestCase):
    def test_failed_source_excluded_from_context(self):
        now=time.time()
        f=features(bars(300),300*300000)
        f.update(lastClosedTime=now*1000-1000,sourceFresh=False)
        output=confluence({'4h':f},{},{'fresh':True},now)
        row=next(r for r in output['rows'] if r['timeframe']=='4h')
        self.assertFalse(row['fresh'])
        self.assertEqual(row['candidates'],[])

    def test_unclosed_extreme_excluded(self):
        raw=bars(300)
        before=features(raw,300*300000)
        raw.append({'t':300*300000,'T':301*300000,'o':'1','h':'1000000','l':'.1','c':'999999','v':'999999'})
        self.assertEqual(before,features(raw,300*300000))

    def test_higher_timeframe_conflict_blocks_breakout(self):
        now=time.time()
        f=features(bars(300),300*300000)
        f.update(close=200,resistance=150,histogram=1,relativeVolume=2,cmf=.2,lastClosedTime=now*1000-1000,trend='bearish')
        indicators={tf:copy.deepcopy(f) for tf in TIMEFRAMES}
        flow={'completeWindow':True,'buyEth':10,'sellEth':1,'deltaEth':9}
        output=confluence(indicators,flow,{'fresh':True},now)
        candidate=next(x for x in output['active'] if x['id']=='breakout')
        self.assertEqual(candidate['status'],'blocked')
        self.assertIn('Désaccord avec les horizons supérieurs',candidate['blockers'])

    def test_missing_flow_blocks_even_aligned_context(self):
        now=time.time()
        f=features(bars(300),300*300000)
        f.update(close=200,resistance=150,histogram=1,relativeVolume=2,cmf=.2,lastClosedTime=now*1000-1000,trend='bullish')
        output=confluence({tf:f for tf in TIMEFRAMES},{'completeWindow':False,'buyEth':10,'sellEth':1,'deltaEth':9},{'fresh':True},now)
        candidate=next(x for x in output['active'] if x['id']=='breakout')
        self.assertIn('Fenêtre order flow incomplète',candidate['blockers'])

    def test_reserved_period_cannot_change_development(self):
        raw=bars()
        config=json.loads((ROOT/'config.example.json').read_text())
        result=compare_strategies(raw,config,601*300000)
        split=250+(len(raw)-250)//2
        altered=copy.deepcopy(raw)
        for b in altered[split:]:
            for key in ('o','h','l','c'):b[key]=str(float(b[key])*10)
        other=compare_strategies(altered,config,601*300000)
        self.assertEqual([x['development'] for x in result['rows']],[x['development'] for x in other['rows']])

if __name__=='__main__':unittest.main()
