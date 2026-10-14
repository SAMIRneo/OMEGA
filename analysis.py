"""Deterministic market features. No claims of predictive performance."""
import math
import numpy as np
import talib

def ema(values, period):
    result = [values[0]]
    alpha = 2 / (period + 1)
    for value in values[1:]:
        result.append(result[-1] + alpha * (value - result[-1]))
    return result

def features(raw, now):
    bars = sorted((b for b in raw if b['T'] < now), key=lambda b: b['t'])
    if len(bars) < 35:
        return {"ready": False}
    close = np.array([float(b['c']) for b in bars])
    high = np.array([float(b['h']) for b in bars])
    low = np.array([float(b['l']) for b in bars])
    volume = np.array([float(b['v']) for b in bars])
    e20,e50,e200 = (talib.EMA(close,timeperiod=p) for p in (20,50,200))
    macd,signal,hist = talib.MACD(close,fastperiod=12,slowperiod=26,signalperiod=9)
    rsi = talib.RSI(close,timeperiod=14)
    atr = talib.ATR(high,low,close,timeperiod=14)
    adx = talib.ADX(high,low,close,timeperiod=14)
    upper,middle,lower = talib.BBANDS(close,timeperiod=20,nbdevup=2,nbdevdn=2,matype=0)
    obv = talib.OBV(close,volume)
    def value(array, index=-1):
        result=float(array[index])
        return result if math.isfinite(result) else None
    v=volume[-40:]
    vwap=float(np.sum((high[-40:]+low[-40:]+close[-40:])/3*v)/np.sum(v)) if np.sum(v) else None
    spreads=high[-20:]-low[-20:]
    multiplier=np.divide(2*close[-20:]-high[-20:]-low[-20:],spreads,out=np.zeros_like(spreads),where=spreads!=0)
    cmf=float(np.sum(multiplier*volume[-20:])/np.sum(volume[-20:])) if np.sum(volume[-20:]) else 0
    volume_base=float(np.mean(volume[-21:-1]))
    body_open=float(bars[-1]['o'])
    candle_range=high[-1]-low[-1]
    long_ready=len(bars)>=250 and value(e200) is not None
    bullish=close[-1]>e20[-1]>e50[-1] and (not long_ready or close[-1]>e200[-1])
    bearish=close[-1]<e20[-1]<e50[-1] and (not long_ready or close[-1]<e200[-1])
    adx_last=value(adx) or 0
    return {'ready':value(e50) is not None, 'backend':'TA-Lib', 'longTrendReady':long_ready,
            'rsi':50 if np.all(close[-15:]==close[-1]) else value(rsi),
            'macd':value(macd),'histogram':value(hist),'atr':value(atr),'adx':adx_last,
            'ema20':value(e20),'ema50':value(e50),'ema200':value(e200),'previousEma20':value(e20,-2),'previousEma50':value(e50,-2),
            'rollingVwap':vwap,'bbUpper':value(upper),'bbLower':value(lower),'bbMiddle':value(middle),
            'previousBbUpper':value(upper,-2),'previousBbLower':value(lower,-2),'cmf':cmf,
            'relativeVolume':float(volume[-1]/volume_base) if volume_base else 0,
            'obvChange20':float(obv[-1]-obv[-21]),'previousClose':float(close[-2]),
            'upperWickRatio':float((high[-1]-max(close[-1],body_open))/candle_range) if candle_range else 0,
            'lowerWickRatio':float((min(close[-1],body_open)-low[-1])/candle_range) if candle_range else 0,
            'high':float(high[-1]),'low':float(low[-1]),
            'trend':'bullish' if bullish else 'bearish' if bearish else 'neutral',
            'regime':'trend' if adx_last>=25 else 'range' if adx_last<20 else 'transition',
            'resistance':float(np.max(high[-21:-1])),'support':float(np.min(low[-21:-1])),
            'lastClosedTime':bars[-1]['T'],'close':float(close[-1]),'bars':len(bars)}

def profiles(raw, now):
    bars = [b for b in raw if b['T'] < now][-48:]
    if not bars:
        return []
    low, high = min(float(b['l']) for b in bars), max(float(b['h']) for b in bars)
    width = max((high-low)/32, 1)
    bins = [{"price": low+(i+.5)*width, "tpo": 0, "volume": 0} for i in range(32)]
    for b in bars:
        start = max(0,min(31,int((float(b['l'])-low)/width)))
        end = max(start,min(31,int((float(b['h'])-low)/width)))
        for i in range(start,end+1):
            bins[i]['tpo'] += 1
            bins[i]['volume'] += float(b['v'])/(end-start+1)
    return bins

def scenarios(indicators, flow):
    short, medium = indicators.get('5m',{}), indicators.get('4h',{})
    if not short.get('ready') or not medium.get('ready'):
        return {"action": "WAIT", "reasons": ["Historique en cours de chargement"], "validated": False}
    reasons = []
    bullish = medium['close'] > medium['ema50']
    reasons.append("Contexte 4 h au-dessus de l'EMA50" if bullish else "Contexte 4 h sous l'EMA50")
    if short['rsi'] > 70:
        reasons.append("RSI 5 min élevé ; aucun rejet confirmé par cette mesure seule")
    elif short['rsi'] < 30:
        reasons.append("RSI 5 min bas ; aucun rebond confirmé par cette mesure seule")
    reasons.append("Momentum 5 min positif" if short['histogram'] > 0 else "Momentum 5 min négatif")
    reasons.append("Delta des transactions observées : " + str(round(flow.get('deltaEth',0),4)) + " ETH")
    return {"action": "OBSERVE", "context": "Haussier" if bullish else "Baissier", "reasons": reasons,
            "validated": False, "note": "Lecture descriptive, pas une stratégie validée ni un score de probabilité."}
