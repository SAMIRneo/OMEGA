"""Exploratory historical tests; next-bar execution and pessimistic ambiguous bars."""
import time
from analysis import ema
from analysis import features
from multiframe import candidates

def compare_strategies(raw, config, now=None):
    now = now or time.time()*1000
    bars = sorted((b for b in raw if b['T']<now),key=lambda b:b['t'])
    if len(bars)<300:
        return {'ready':False,'note':'Au moins 300 bougies requises, dont 250 pour l’échauffement'}
    signals={}
    for i in range(250,len(bars)):
        # Only candles available before the opening at i enter the features.
        f=features(bars[:i],bars[i]['t'])
        signals[i]=(f,candidates(f))
    split=250+(len(bars)-250)//2
    def simulate(strategy,start,end):
        equity=config['paper_capital']
        trades=[]
        position=None
        peak=equity
        drawdown=0
        costs=(config['fee_bps']+config['slippage_bps'])/10000
        for i in range(start,end):
            b=bars[i]
            f,options=signals[i]
            option=next((x for x in options if x['id']==strategy),None)
            if not position and equity>0 and option and option['direction']:
                entry=float(b['o'])
                distance=1.5*f['atr']
                if distance>0:
                    quantity=min(config['max_risk']/(distance+2*entry*costs),min(config['max_margin'],equity)*config['leverage']/entry)
                    d=option['direction']
                    position={'entry':entry,'stop':entry-d*distance,'target':entry+d*distance*2,'direction':d,'quantity':quantity,'bar':i}
            if not position:continue
            p=position
            stop_hit=float(b['l'])<=p['stop'] if p['direction']==1 else float(b['h'])>=p['stop']
            target_hit=float(b['h'])>=p['target'] if p['direction']==1 else float(b['l'])<=p['target']
            price=None
            if stop_hit:price=min(p['stop'],float(b['o'])) if p['direction']==1 else max(p['stop'],float(b['o']))
            elif target_hit:price=p['target']
            elif i-p['bar']>=12 or i==end-1:price=float(b['c'])
            if price is not None:
                pnl=p['direction']*(price-p['entry'])*p['quantity']-(price+p['entry'])*p['quantity']*costs
                equity+=pnl
                trades.append(pnl)
                peak=max(peak,equity)
                drawdown=max(drawdown,peak-equity)
                position=None
        return {'trades':len(trades),'netPnl':equity-config['paper_capital'],'wins':sum(x>0 for x in trades),'maxDrawdownUsd':drawdown}
    return {'ready':True,'warmupBars':250,'developmentBars':split-250,'holdoutBars':len(bars)-split,
            'start':bars[250]['t'],'split':bars[split]['t'],'end':bars[-1]['T'],
            'rows':[{'id':key,'development':simulate(key,250,split),'holdout':simulate(key,split,len(bars))} for key in ('pullback','breakout','reversion','rejection')],
            'validated':False,'note':'Paramètres fixes, séparation chronologique exploratoire, sans optimisation. Chaque famille est testée seule sur cet horizon ; filtres multi-horizon et order flow non rejoués. Frais/slippage inclus ; funding, liquidation et limites journalières exclus. Historique court, pas une certification hors échantillon.'}

def backtest(raw, config, now=None):
    now = now or time.time()*1000
    bars = sorted((b for b in raw if b['T']<now),key=lambda b:b['t'])
    if len(bars)<60:
        return {'ready':False,'note':'Historique insuffisant'}
    close = [float(b['c']) for b in bars]
    fast, slow = ema(close,20),ema(close,50)
    tr = [float(bars[0]['h'])-float(bars[0]['l'])]
    for i in range(1,len(bars)):
        b=bars[i]
        tr.append(max(float(b['h'])-float(b['l']),abs(float(b['h'])-close[i-1]),abs(float(b['l'])-close[i-1])))
    equity = config['paper_capital']
    peak, drawdown = equity,0
    position=None
    trades=[]
    costs=(config['fee_bps']+config['slippage_bps'])/10000
    for i in range(51,len(bars)):
        b=bars[i]
        # A crossover known at the previous close is executed at this open.
        if not position:
            previous=i-1
            direction = 1 if fast[previous]>slow[previous] and fast[previous-1]<=slow[previous-1] else -1 if fast[previous]<slow[previous] and fast[previous-1]>=slow[previous-1] else 0
            if direction and equity>0:
                opening=float(b['o'])
                atr=sum(tr[previous-13:previous+1])/14
                distance=1.5*atr
                if distance>0:
                    quantity=min(config['max_risk']/(distance+2*opening*costs),config['max_margin']*config['leverage']/opening,max(0,equity)*config['leverage']/opening)
                    if quantity>0:
                        position={'entry':opening,'direction':direction,'quantity':quantity,'stop':opening-direction*distance,'target':opening+direction*distance*2,'bar':i}
        if position:
            p=position
            stop_hit=float(b['l'])<=p['stop'] if p['direction']==1 else float(b['h'])>=p['stop']
            target_hit=float(b['h'])>=p['target'] if p['direction']==1 else float(b['l'])<=p['target']
            reason=None
            exit_price=None
            if stop_hit:
                exit_price=min(p['stop'],float(b['o'])) if p['direction']==1 else max(p['stop'],float(b['o']))
                reason='stop' # If both hit in one bar, stop wins.
            elif target_hit:
                exit_price=p['target']
                reason='target'
            elif i-p['bar']>=12 or i==len(bars)-1:
                exit_price=float(b['c'])
                reason='time-exit'
            if reason:
                gross=p['direction']*(exit_price-p['entry'])*p['quantity']
                pnl=gross-(exit_price+p['entry'])*p['quantity']*costs
                equity+=pnl
                peak=max(peak,equity)
                drawdown=max(drawdown,peak-equity)
                trades.append({'entryTime':bars[p['bar']]['t'],'exitTime':b['T'],'netPnl':pnl,'reason':reason})
                position=None
    return {'ready':True,'strategy':'Croisement EMA20/50 · stop 1,5 ATR · objectif 3 ATR','start':bars[0]['t'],'end':bars[-1]['T'],'bars':len(bars),'trades':trades,'netPnl':equity-config['paper_capital'],'equity':equity,'maxDrawdownUsd':drawdown,'wins':sum(t['netPnl']>0 for t in trades),'validated':False,'assumptions':'Exploratoire sur les bougies 5 min disponibles : aucun résultat hors échantillon. Entrée à l’ouverture suivante, frais/slippage fixes ; stop prioritaire si stop et cible touchés. Funding, carnet, liquidation et limites journalières non modélisés. Ne prouve aucun avantage.'}
