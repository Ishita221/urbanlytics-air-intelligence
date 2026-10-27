import type { AirData, Hour } from './domain';
const average=(a:number[])=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
export function airAnalytics(data:AirData,threshold=150){
 const past=data.hours.filter(h=>h.time<=data.validAt),last=past.slice(-24),future=data.hours.filter(h=>h.time>data.validAt).slice(0,72);
 const fields=['us_aqi','pm2_5','pm10','nitrogen_dioxide','ozone','sulphur_dioxide','carbon_monoxide'] as (keyof Hour)[];
 const missing=last.reduce((s,h)=>s+fields.filter(f=>h[f]==null).length,0),total=last.length*fields.length;
 const gaps=past.slice(1).filter((h,i)=>h.time-past[i].time!==3600).length;
 const previous=past.find(h=>h.time===data.validAt-86400);
 const baselines=past.slice(-169,-1).map(h=>h.pm2_5).filter((v):v is number=>v!==null);
 const mean=average(baselines),sd=mean===null?null:Math.sqrt(baselines.reduce((s,v)=>s+(v-mean)**2,0)/baselines.length);
 const z=data.current.pm2_5!==null&&mean!==null&&sd!==null&&sd>0?(data.current.pm2_5-mean)/sd:null;
 const events=future.filter(h=>h.us_aqi!==null && h.us_aqi>=threshold);
 return {coverage:total?Math.round((total-missing)/total*100):null,missing,gaps,samples:last.length,pmMean24:average(last.map(h=>h.pm2_5).filter((v):v is number=>v!==null)),aqiChange24:previous?.us_aqi!=null&&data.current.us_aqi!==null?data.current.us_aqi-previous.us_aqi:null,zScore:z,unusual:z!==null&&Math.abs(z)>=3,threshold,exceedanceHours:events.length,firstExceedance:events[0]?.time??null,peak:future.filter(h=>h.us_aqi!==null).sort((a,b)=>b.us_aqi!-a.us_aqi!)[0]??null};
}
