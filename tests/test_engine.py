import json
import math
import pathlib
import tempfile
import time
import unittest
from engine import Engine, ROOT
from analysis import features
from research import backtest

class PaperTests(unittest.TestCase):
    def setUp(self):
        self.directory=tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.config=json.loads((ROOT/'config.json').read_text())
        self.engine=Engine(self.config,pathlib.Path(self.directory.name)/'paper.json')
        self.engine.market={'connected':True,'lastEvent':time.time(),'book':{'time':time.time()*1000,'levels':[[{'px':'85000','sz':'2'}],[{'px':'85001','sz':'2'}]]},'error':None}
        self.engine.context={'maxLeverage':40,'updatedAt':time.time()}

    def open(self):
        return self.engine.open({'side':'long','margin':2,'stop':84700,'target':85600})

    def test_roundtrip_costs_and_reload(self):
        self.open()
        closed=self.engine.close()
        self.assertLess(closed['netPnl'],0)
        self.assertAlmostEqual(self.engine.paper['cash'],50+closed['netPnl'])
        reloaded=Engine(self.config,self.engine.path)
        self.assertEqual(len(reloaded.paper['history']),1)

    def test_stale_rejected(self):
        self.engine.market['lastEvent']=time.time()-10
        with self.assertRaises(ValueError):self.open()

    def test_source_stale_rejected(self):
        self.engine.market['book']['time']=(time.time()-20)*1000
        with self.assertRaises(ValueError):self.open()

    def test_daily_loss_limit(self):
        self.engine.rollover()
        self.engine.paper['dailyPnl']=-5
        with self.assertRaises(ValueError):self.open()

    def test_flat_market_backtest_no_trades(self):
        bars=[{'t':i,'T':i+1,'o':'100','h':'100','l':'100','c':'100','v':'1'} for i in range(100)]
        output=backtest(bars,self.config,200)
        self.assertEqual(output['trades'],[])
        self.assertEqual(output['equity'],50)

    def test_nan_and_risk_rejected(self):
        with self.assertRaises(ValueError):self.engine.open({'side':'long','margin':math.nan,'stop':84700,'target':85600})
        with self.assertRaises(ValueError):self.engine.open({'side':'long','margin':5,'stop':84000,'target':85600})

    def test_stop_closes(self):
        self.open()
        self.engine.market['book']['levels']=[[{'px':'84690','sz':'2'}],[{'px':'84691','sz':'2'}]]
        self.engine.manage()
        self.assertIsNone(self.engine.paper['position'])
        self.assertEqual(self.engine.paper['history'][-1]['reason'],'stop')

    def test_flat_rsi_and_exclude_open_bar(self):
        bars=[{'t':i,'T':i+1,'o':'100','h':'100','l':'100','c':'100','v':'1'} for i in range(100)]
        output=features(bars,99)
        self.assertEqual(output['rsi'],50)
        self.assertEqual(output['bars'],98)
        self.assertEqual(output['atr'],0)

if __name__=='__main__':unittest.main()
