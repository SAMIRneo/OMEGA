import collections
import copy
import json
import math
import pathlib
import threading
import time
import uuid
from datetime import datetime, timezone
import websocket
from bot import Hyperliquid
from analysis import features, profiles, scenarios
from research import backtest, compare_strategies
from multiframe import TIMEFRAMES, confluence

ROOT = pathlib.Path(__file__).parent

class Engine:
    def __init__(self, config, storage=None):
        self.config = config
        self.client = Hyperliquid(config['network'])
        self.lock = threading.RLock()
        self.stop = threading.Event()
        self.path = pathlib.Path(storage) if storage else ROOT/'data'/'paper-eth.json'
        self.market = {"connected": False, "book": None, "lastEvent": 0, "error": None}
        self.bars = {}
        self.candle_status = {}
        self.feature_cache = {}
        self.flow_started = None
        self.account = None
        self.account_time = 0
        self.account_error = None
        self.context = {}
        self.research = {'ready':False}
        self.comparisons = {}
        self.last_save = time.monotonic()
        self.trades = collections.deque(maxlen=10000)
        self.seen = collections.deque(maxlen=20000)
        self.seen_set = set()
        self.paper = {"initial": config['paper_capital'], "cash": config['paper_capital'], "position": None, "history": [], "events": [], "day": "", "dailyPnl": 0}
        if self.path.exists():
            self.paper = json.loads(self.path.read_text(encoding='utf-8'))
            if self.paper['position']:
                self.paper['position']['lastFunding'] = time.time()
                self.paper['events'].append({'at':time.time(),'action':'resume','note':'Surveillance interrompue pendant l’arrêt ; funding hors ligne non reconstitué'})

    def start(self):
        for target in (self.stream, self.refresh):
            threading.Thread(target=target, daemon=True).start()

    def persist(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix('.tmp')
        temporary.write_text(json.dumps(self.paper,allow_nan=False),encoding='utf-8')
        temporary.replace(self.path)

    def stream(self):
        delay = 1
        while not self.stop.is_set():
            socket = None
            try:
                socket = websocket.create_connection(self.client.base.replace('https:','wss:')+'/ws', timeout=10)
                with self.lock:
                    self.flow_started = time.time()
                for kind in ('l2Book','trades'):
                    socket.send(json.dumps({"method":"subscribe","subscription":{"type":kind,"coin":"ETH"}}))
                delay = 1
                ping = time.monotonic()
                while not self.stop.is_set():
                    if time.monotonic()-ping > 20:
                        socket.send('{"method":"ping"}')
                        ping = time.monotonic()
                    try:
                        raw = socket.recv()
                    except websocket.WebSocketTimeoutException:
                        continue
                    if not raw:
                        raise ConnectionError('Disconnected')
                    event = json.loads(raw)
                    channel, data = event.get('channel'), event.get('data')
                    with self.lock:
                        if channel == 'l2Book':
                            self.market.update(book=data, connected=True, lastEvent=time.time(), error=None)
                            self.manage()
                        elif channel == 'trades':
                            for trade in data:
                                key = (trade['time'],trade.get('tid'),trade.get('hash'))
                                if key in self.seen_set:
                                    continue
                                if len(self.seen)==self.seen.maxlen:
                                    self.seen_set.discard(self.seen[0])
                                self.seen.append(key)
                                self.seen_set.add(key)
                                self.trades.append(trade)
            except Exception as error:
                with self.lock:
                    self.market.update(connected=False, error=type(error).__name__)
                    self.flow_started = None
                self.stop.wait(delay)
                delay = min(delay*2,30)
            finally:
                if socket:
                    socket.close()

    def refresh(self):
        due = {}
        cadence = {'5m':60,'15m':60,'30m':120,'1h':180,'4h':300,'1d':900,'1w':1800}
        while not self.stop.is_set():
            for interval in TIMEFRAMES:
                if time.time()<due.get(interval,0):
                    continue
                try:
                    bars = self.client.candles(interval, count=1000)
                    computed = features(bars,time.time()*1000)
                    comparison = compare_strategies(bars,self.config) if interval in ('5m','15m','1h') else None
                    with self.lock:
                        self.bars[interval] = bars
                        self.feature_cache[interval] = computed
                        if comparison is not None:
                            self.comparisons[interval] = comparison
                        self.candle_status[interval] = {'fetchedAt':time.time(),'error':None}
                        if interval=='5m':
                            self.research = backtest(bars,self.config)
                    due[interval] = time.time()+cadence[interval]
                except Exception as error:
                    with self.lock:
                        self.candle_status.setdefault(interval,{'fetchedAt':0})['error'] = type(error).__name__
                    due[interval] = time.time()+30
            try:
                if time.time()>=due.get('context',0):
                    meta, contexts = self.client.info({"type":"metaAndAssetCtxs"})
                    index = next(i for i,a in enumerate(meta['universe']) if a['name']=='ETH')
                    with self.lock:
                        self.context = {**contexts[index], "maxLeverage":meta['universe'][index]['maxLeverage'], "updatedAt":time.time()}
                    due['context']=time.time()+60
            except Exception:
                pass
            try:
                if time.time()>=due.get('account',0) and self.config['account'] != '0x'+'0'*40:
                    address = self.config['account']
                    account = self.client.account(address)
                    with self.lock:
                        if address == self.config['account']:
                            self.account, self.account_time, self.account_error = account, time.time(), None
                    due['account']=time.time()+60
            except Exception as error:
                with self.lock:
                    self.account_error = type(error).__name__
            self.stop.wait(15)

    def fresh(self):
        book = self.market['book']
        return bool(self.market['connected'] and book and time.time()-self.market['lastEvent']<5 and abs(time.time()*1000-book['time'])<self.config.get('source_max_age_seconds',15)*1000)

    def quote(self, side, quantity):
        book = self.market['book']
        levels = book['levels'][1 if side=='long' else 0]
        remaining, cost = quantity, 0
        for level in levels:
            amount = min(remaining,float(level['sz']))
            cost += amount*float(level['px'])
            remaining -= amount
            if remaining <= 1e-10:
                break
        if remaining > 1e-10:
            raise ValueError('Profondeur visible insuffisante')
        price = cost/quantity
        return price*(1+self.config['slippage_bps']/10000*(1 if side=='long' else -1))

    def rollover(self):
        day = datetime.now(timezone.utc).date().isoformat()
        if self.paper['day']!=day:
            self.paper.update(day=day,dailyPnl=0)

    def open(self, args):
        with self.lock:
            if not self.fresh():
                raise ValueError('Flux périmé ou déconnecté : simulation refusée')
            self.rollover()
            if self.paper['position']:
                raise ValueError('Une seule position simulée à la fois')
            if self.paper['dailyPnl'] <= -self.config['daily_loss_limit']:
                raise ValueError('Limite de perte quotidienne atteinte')
            side = args.get('side')
            if side not in ('long','short'):
                raise ValueError('Sens invalide')
            margin, stop, target = (float(args[k]) for k in ('margin','stop','target'))
            if not all(math.isfinite(v) and v>0 for v in (margin,stop,target)):
                raise ValueError('Valeurs positives et finies requises')
            leverage = self.config['leverage']
            if not self.context or time.time()-self.context['updatedAt']>120:
                raise ValueError('Métadonnées indisponibles ou périmées')
            if leverage > self.context['maxLeverage']:
                raise ValueError('Levier supérieur au maximum ETH actuel')
            if margin>self.config['max_margin']:
                raise ValueError('Marge maximale simulée : '+str(self.config['max_margin'])+' $')
            best = float(self.market['book']['levels'][1 if side=='long' else 0][0]['px'])
            quantity = margin*leverage/best
            entry = self.quote(side,quantity)
            direction = 1 if side=='long' else -1
            # Small isolated position approximation; not a cross-margin liquidation model.
            maintenance = .5/self.context['maxLeverage']
            liquidation = (entry-direction*margin/quantity)/(1-direction*maintenance)
            if not (direction*(entry-stop)>0 and direction*(target-entry)>0 and direction*(stop-liquidation)>entry*.001):
                raise ValueError('Stop/objectif incohérents ou stop trop proche de la liquidation estimée')
            fee = entry*quantity*self.config['fee_bps']/10000
            risk = abs(entry-stop)*quantity + fee + stop*quantity*(self.config['fee_bps']+self.config['slippage_bps'])/10000
            if risk>self.config['max_risk']:
                raise ValueError('Risque au stop supérieur à '+str(self.config['max_risk'])+' $')
            if margin+fee>self.paper['cash']:
                raise ValueError('Solde simulé insuffisant')
            self.paper['cash']-=fee
            self.paper['dailyPnl']-=fee
            self.paper['position']={"id":uuid.uuid4().hex,"side":side,"entry":entry,"quantity":quantity,"margin":margin,"leverage":leverage,"stop":stop,"target":target,"liquidationEstimate":liquidation,"openedAt":time.time(),"entryFee":fee,"funding":0,"lastFunding":time.time(),"risk":risk}
            self.paper['events'].append({"at":time.time(),"action":"open","side":side})
            self.persist()
            return copy.deepcopy(self.paper['position'])

    def close(self, reason='manual'):
        with self.lock:
            if not self.fresh():
                raise ValueError('Flux périmé : clôture simulée refusée')
            p = self.paper['position']
            if not p:
                raise ValueError('Aucune position simulée')
            price = self.quote('short' if p['side']=='long' else 'long',p['quantity'])
            direction = 1 if p['side']=='long' else -1
            pnl = direction*(price-p['entry'])*p['quantity']
            fee = price*p['quantity']*self.config['fee_bps']/10000
            # A gap liquidation consumes the modeled isolated margin (not other cash).
            if reason=='liquidation-estimate':
                pnl = -p['margin']
            self.rollover()
            self.paper['cash'] += pnl-fee
            self.paper['dailyPnl'] += pnl-fee
            record = {**p,"exit":price,"closedAt":time.time(),"reason":reason,"netPnl":pnl-fee-p['entryFee']-p['funding'],"exitFee":fee}
            self.paper['history'].append(record)
            self.paper['position']=None
            self.paper['events'].append({"at":time.time(),"action":"close","reason":reason})
            self.persist()
            return record

    def manage(self):
        p = self.paper['position']
        if not p or not self.fresh():
            return
        now = time.time()
        rate = self.context.get('funding')
        if rate is not None and now-self.context.get('updatedAt',0)<120:
            charge = p['quantity']*float(self.context.get('markPx',p['entry']))*float(rate)*(now-p['lastFunding'])/3600*(1 if p['side']=='long' else -1)
            self.rollover()
            p['funding']+=charge
            self.paper['cash']-=charge
            self.paper['dailyPnl']-=charge
        p['lastFunding']=now
        bid,ask = self.market['book']['levels']
        if not bid or not ask:
            return
        px = float((bid if p['side']=='long' else ask)[0]['px'])
        direction = 1 if p['side']=='long' else -1
        reason = 'liquidation-estimate' if direction*(px-p['liquidationEstimate'])<=0 else 'stop' if direction*(px-p['stop'])<=0 else 'target' if direction*(px-p['target'])>=0 else None
        if reason:
            try:
                self.close(reason)
            except ValueError:
                pass
        if time.monotonic()-self.last_save>30:
            self.persist()
            self.last_save=time.monotonic()

    def snapshot(self):
        with self.lock:
            now = time.time()
            recent = [t for t in self.trades if t['time']>now*1000-60000]
            buy = sum(float(t['sz']) for t in recent if t['side']=='B')
            sell = sum(float(t['sz']) for t in recent if t['side']=='A')
            complete = bool(self.flow_started and now-self.flow_started>=75 and self.market['connected'] and (len(self.trades)<self.trades.maxlen or self.trades[0]['time']<=now*1000-60000))
            flow = {"buyEth":buy,"sellEth":sell,"deltaEth":buy-sell,"count":len(recent),"windowSeconds":60,"completeWindow":complete,"coverage":"Fenêtre continue observée" if complete else "Depuis la connexion ; incomplet après une interruption"}
            indicators = copy.deepcopy(self.feature_cache)
            for interval,f in indicators.items():
                status=self.candle_status.get(interval,{})
                max_age={'5m':180,'15m':180,'30m':300,'1h':420,'4h':660,'1d':1860,'1w':3660}[interval]
                f['sourceFresh']=bool(status.get('fetchedAt') and not status.get('error') and now-status['fetchedAt']<max_age)
            alignment = confluence(indicators,flow,{'fresh':self.fresh()},now)
            paper = copy.deepcopy(self.paper)
            book = self.market['book']
            mid = None
            if book and all(book['levels']):
                mid = (float(book['levels'][0][0]['px'])+float(book['levels'][1][0]['px']))/2
            p = paper['position']
            paper['unrealized']= (mid-p['entry'])*p['quantity']*(1 if p['side']=='long' else -1) if p and mid else 0
            paper['equity']=paper['cash']+paper['unrealized']
            return {"time":now,"mode":"paper","runtime":"local","accountAddress":self.config['account'],"market":{**self.market,"fresh":self.fresh(),"mid":mid,"sourceAgeSeconds":now-book["time"]/1000 if book else None},"context":copy.deepcopy(self.context),"flow":flow,"indicators":indicators,"profiles":profiles(self.bars.get('30m',[]),now*1000),"candles":copy.deepcopy(self.bars.get('5m',[])),"scenario":alignment,"multiTimeframe":alignment,"candleStatus":copy.deepcopy(self.candle_status),"candlesByTimeframe":copy.deepcopy(self.bars),"account":copy.deepcopy(self.account),"accountTime":self.account_time,"accountError":self.account_error,"paper":paper,"research":copy.deepcopy(self.research),"strategyResearch":copy.deepcopy(self.comparisons),"limits":self.config,"macro":{"connected":False},"model":{"connected":False}}
