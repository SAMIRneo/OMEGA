//! Pure risk calculations for simulated ETH positions. No exchange or signing API.
#[no_mangle]
pub extern "C" fn risk_version() -> u32 { 1 }

/// Planned loss includes entry fee and stop exit fee/slippage.
#[no_mangle]
pub extern "C" fn planned_loss(direction: f64, entry: f64, stop: f64, quantity: f64, fee_bps: f64, slip_bps: f64) -> f64 {
    if ![direction,entry,stop,quantity,fee_bps,slip_bps].iter().all(|v|v.is_finite())
        || direction.abs()!=1.0 || entry<=0.0 || stop<=0.0 || quantity<=0.0 || fee_bps<0.0 || slip_bps<0.0
        || direction*(entry-stop)<=0.0 { return f64::NAN; }
    direction*(entry-stop)*quantity + entry*quantity*fee_bps/10000.0 + stop*quantity*(fee_bps+slip_bps)/10000.0
}

/// Margin sizing with 10% reserve under the planned-risk cap.
#[no_mangle]
pub extern "C" fn size_margin(direction:f64, best:f64, atr:f64, leverage:f64, max_margin:f64, max_risk:f64, cash:f64, fee_bps:f64, slip_bps:f64) -> f64 {
    if ![direction,best,atr,leverage,max_margin,max_risk,cash,fee_bps,slip_bps].iter().all(|v|v.is_finite())
        || direction.abs()!=1.0 || best<=0.0 || atr<=0.0 || leverage<=0.0 || max_margin<=0.0 || max_risk<=0.0 || cash<=0.0 || fee_bps<0.0 || slip_bps<0.0 {return 0.0;}
    let entry=best*(1.0+direction*slip_bps/10000.0);
    let stop=entry-direction*atr*1.5;
    let risk=planned_loss(direction,entry,stop,1.0,fee_bps,slip_bps);
    if !risk.is_finite() || risk<=0.0 {return 0.0;}
    let available=cash/(1.0+leverage*fee_bps/10000.0);
    let margin=(max_risk*0.9/risk*best/leverage).min(max_margin).min(available);
    (margin*100.0).floor()/100.0
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn long_and_short_costs(){assert!((planned_loss(1.0,2500.0,2480.0,0.02,4.5,2.0)-0.45474).abs()<1e-10);assert!((planned_loss(-1.0,2500.0,2520.0,0.02,4.5,2.0)-0.45526).abs()<1e-10);}
    #[test] fn invalid_inputs(){assert!(planned_loss(1.0,2500.0,2600.0,0.02,4.5,2.0).is_nan());assert!(planned_loss(1.0,f64::NAN,2400.0,1.0,4.5,2.0).is_nan());assert_eq!(size_margin(1.0,2500.0,10.0,10.0,5.0,1.0,-1.0,4.5,2.0),0.0);}
    #[test] fn size_respects_risk_and_capital(){for d in [-1.0,1.0]{let margin=size_margin(d,2500.0,10.0,10.0,5.0,1.0,50.0,4.5,2.0);let entry=2500.0*(1.0+d*0.0002);let risk=planned_loss(d,entry,entry-d*15.0,margin*10.0/2500.0,4.5,2.0);assert!(margin>0.0 && margin<=5.0);assert!(risk<=0.9);}}
}
