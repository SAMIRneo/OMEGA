"""Explainable strategy candidates; no automatic real-money execution."""
TIMEFRAMES = {'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1d':86400,'1w':604800}

def candidates(f):
    if not f.get('ready'):
        return []
    trend=f['trend']
    trending=f['adx']>=25
    ranging=f['adx']<20
    c,previous=f['close'],f['previousClose']
    rules=[
      ('pullback','Reprise de tendance', 'trend',
       1 if trending and trend=='bullish' and previous<=f['previousEma20'] and c>f['ema20'] and f['histogram']>0 and 45<f['rsi']<70 else
       -1 if trending and trend=='bearish' and previous>=f['previousEma20'] and c<f['ema20'] and f['histogram']<0 and 30<f['rsi']<55 else 0,
       'ADX ≥25, tendance EMA, retour au-dessus/sous EMA20, MACD et RSI cohérents'),
      ('breakout','Cassure avec volume','trend',
       1 if c>f['resistance'] and f['relativeVolume']>=1.5 and f['histogram']>0 and f['cmf']>0 else
       -1 if c<f['support'] and f['relativeVolume']>=1.5 and f['histogram']<0 and f['cmf']<0 else 0,
       'Clôture au-delà du canal 20 bougies précédentes, volume relatif ≥1,5 et CMF/MACD concordants'),
      ('reversion','Retour à la moyenne','range',
       1 if ranging and f['previousClose']<f['previousBbLower'] and c>f['bbLower'] and f['rsi']<45 else
       -1 if ranging and f['previousClose']>f['previousBbUpper'] and c<f['bbUpper'] and f['rsi']>55 else 0,
       'ADX <20, réintégration des bandes de Bollinger et RSI compatible'),
      ('rejection','Rejet d’un extrême','reversal',
       -1 if f['high']>f['resistance'] and c<f['resistance'] and f['upperWickRatio']>=.45 and f['rsi']>60 and f['relativeVolume']>=1 else
       1 if f['low']<f['support'] and c>f['support'] and f['lowerWickRatio']>=.45 and f['rsi']<40 and f['relativeVolume']>=1 else 0,
       'Excursion au-delà d’un niveau puis réintégration, mèche ≥45 %, RSI et volume')
    ]
    return [{'id':key,'name':name,'family':family,'direction':direction,'side':'long' if direction==1 else 'short' if direction==-1 else None,'status':'candidate' if direction else 'waiting','rule':rule} for key,name,family,direction,rule in rules]

def confluence(indicators, flow, market, now):
    rows=[]
    for tf,seconds in TIMEFRAMES.items():
        f=indicators.get(tf,{})
        fresh=bool(f.get('ready') and f.get('sourceFresh',True) and 0<=now*1000-f['lastClosedTime']<seconds*2000)
        rows.append({'timeframe':tf,**f,'fresh':fresh,'candidates':candidates(f) if fresh else [],'role':'déclenchement' if tf in ('5m','15m') else 'structure' if tf in ('30m','1h') else 'contexte'})
    by_tf={row['timeframe']:row for row in rows}
    context=[by_tf[tf] for tf in ('1h','4h','1d') if by_tf[tf]['fresh']]
    votes=[1 if row['trend']=='bullish' else -1 if row['trend']=='bearish' else 0 for row in context]
    direction=1 if votes and all(v==1 for v in votes) else -1 if votes and all(v==-1 for v in votes) else 0
    complete=len(context)==3
    active=[]
    for row in rows:
        if row['timeframe'] not in ('5m','15m'):
            continue
        for candidate in row['candidates']:
            if candidate['direction']:
                reasons=[]
                if not complete:reasons.append('Contexte 1 h / 4 h / 1 j incomplet')
                if not market.get('fresh'):reasons.append('Carnet périmé')
                if not flow.get('completeWindow'):reasons.append('Fenêtre order flow incomplète')
                if candidate['family']=='trend' and (not direction or direction!=candidate['direction']):reasons.append('Désaccord avec les horizons supérieurs')
                total=flow.get('buyEth',0)+flow.get('sellEth',0)
                normalized=flow.get('deltaEth',0)/total if total else 0
                if total==0 or normalized*candidate['direction']<=.1:reasons.append('Delta 60 s non concordant ou faible')
                if candidate['family']=='range' and by_tf['1h'].get('regime')!='range':reasons.append('Range non confirmé en 1 h')
                if candidate['family']=='reversal' and direction and direction!=candidate['direction']:reasons.append('Rejet contre la tendance des horizons supérieurs')
                active.append({**candidate,'timeframe':row['timeframe'],'status':'blocked' if reasons else 'confluence','blockers':reasons,'warning':'Hypothèse non validée hors échantillon'})
    reasons=['Contexte 1 h / 4 h / 1 j '+('aligné haussier' if direction==1 else 'aligné baissier' if direction==-1 else 'mixte / neutre')]
    if not complete:reasons.append('Certaines unités de contexte sont manquantes ou périmées')
    if not active:reasons.append('Aucune des quatre règles de déclenchement n’est satisfaite en 5 / 15 min')
    else:reasons.append(str(sum(x['status']=='confluence' for x in active))+' configuration(s) avec confirmations ; les autres sont bloquées')
    return {'rows':rows,'active':active,'action':'RESEARCH' if any(x['status']=='confluence' for x in active) else 'WAIT','context':'Haussier' if direction==1 else 'Baissier' if direction==-1 else 'Mixte / neutre','reasons':reasons,'validated':False,'note':'Conditions déterministes de recherche ; ni probabilité ni validation de rentabilité. Les votes EMA/RSI/MACD ne sont pas des preuves indépendantes.'}
