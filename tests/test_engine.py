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
        self.config=json.loads((ROOT/'config.example.json').read_text())
        self.config.update(paper_capital=50,leverage=10,max_margin=5,max_risk=1,daily_loss_limit=5,daily_mode=False)
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
        with self.assertRaises(ValueError):self.engine.open({'side':'long','margin':5,'stop':82000,'target':85600})

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

class EthMigrationTests(unittest.TestCase):
    def test_default_storage_does_not_reuse_btc_paper(self):
        config=json.loads((ROOT/'config.example.json').read_text())
        engine=Engine(config)
        self.assertEqual(engine.path.name,'axiom-daily-paper.json')
        self.assertEqual(config['leverage'],15)

    def test_public_market_requests_use_eth(self):
        from bot import Hyperliquid
        from unittest.mock import Mock
        client=Hyperliquid()
        client.info=Mock(return_value=[])
        client.candles('5m')
        self.assertEqual(client.info.call_args.args[0]['req']['coin'],'ETH')

class OmegaDailyTests(unittest.TestCase):
    def setUp(self):
        from unittest.mock import patch
        from datetime import datetime, timezone
        self.directory=tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.clock=patch('engine.datetime',wraps=datetime)
        mocked=self.clock.start()
        self.addCleanup(self.clock.stop)
        mocked.now.return_value=datetime(2026,10,14,10,tzinfo=timezone.utc)
        self.config=json.loads((ROOT/'config.example.json').read_text())
        self.engine=Engine(self.config,pathlib.Path(self.directory.name)/'daily.json')
        self.engine.market={'connected':True,'lastEvent':time.time(),'book':{'time':time.time()*1000,'levels':[[{'px':'2499.9','sz':'100'}],[{'px':'2500.1','sz':'100'}]]},'error':None}
        self.engine.context={'maxLeverage':25,'updatedAt':time.time()}

    def test_half_capital_leverage_and_daily_quota_survive_reload(self):
        self.engine.open({'side':'long','margin':5000,'stop':2490,'target':2520,'leverage':15})
        self.engine.close()
        reload=Engine(self.config,self.engine.path)
        reload.market=self.engine.market
        reload.context=self.engine.context
        self.assertEqual(reload.paper['entriesToday'],1)
        with self.assertRaisesRegex(ValueError,'quotidienne'):
            reload.open({'side':'long','margin':reload.paper['cash']*.5,'stop':2490,'target':2520})

    def test_daily_rejects_wrong_margin_and_excess_leverage(self):
        with self.assertRaises(ValueError):self.engine.open({'side':'long','margin':4999,'stop':2490,'target':2520})
        with self.assertRaises(ValueError):self.engine.open({'side':'long','margin':5000,'stop':2490,'target':2520,'leverage':16})

    def test_daily_rejects_risk_above_500(self):
        with self.assertRaisesRegex(ValueError,'Risque'):
            self.engine.open({'side':'long','margin':5000,'stop':2470,'target':2560})
