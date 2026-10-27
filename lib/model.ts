import type { Hour, ModelResult } from './domain';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
function features(rows: Hour[], i: number): number[] | null {
  const h = rows[i], a=rows[i-1], b=rows[i-24], c=rows[i-48];
  if (!h || !a || !b || !c || ![a.pm2_5,b.pm2_5,c.pm2_5,h.temperature_2m,h.wind_speed_10m,h.relative_humidity_2m].every(finite)) return null;
  const hour=new Date(h.time*1000).getUTCHours();
  return [1,a.pm2_5!/100,b.pm2_5!/100,c.pm2_5!/100,Math.sin(hour*Math.PI/12),Math.cos(hour*Math.PI/12),h.temperature_2m!/40,h.wind_speed_10m!/30,h.relative_humidity_2m!/100];
}
function fit(samples: { x:number[]; y:number }[]) {
  const n=9, a=Array.from({length:n},()=>Array(n+1).fill(0));
  for(const {x,y} of samples) for(let i=0;i<n;i++){ for(let j=0;j<n;j++) a[i][j]+=x[i]*x[j];a[i][n]+=x[i]*y; }
  for(let i=1;i<n;i++)a[i][i]+=0.5;
  for(let i=0;i<n;i++){
    let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;
    [a[i],a[pivot]]=[a[pivot],a[i]];if(Math.abs(a[i][i])<1e-9)return null;
    const d=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=d;
    for(let k=0;k<n;k++)if(k!==i){const m=a[k][i];for(let j=i;j<=n;j++)a[k][j]-=m*a[i][j];}
  }
  return a.map(row=>row[n]);
}
export function trainForecast(hours: Hour[], validAt:number): ModelResult {
  const past=hours.filter(h=>h.time<=validAt), samples:{x:number[];y:number}[]=[];
  for(let i=48;i<past.length;i++){const x=features(past,i);if(x && finite(past[i].pm2_5))samples.push({x,y:past[i].pm2_5!});}
  if(samples.length<60)return {method:'Insufficient complete history for regression',samples:samples.length,mae:null,persistenceMae:null,points:[]};
  const split=samples.length-24, weights=fit(samples.slice(0,split));
  if(!weights)return {method:'Regression unavailable',samples:samples.length,mae:null,persistenceMae:null,points:[]};
  const predict=(x:number[],w:number[])=>Math.max(0,Math.min(2000,x.reduce((s,v,i)=>s+v*w[i],0)));
  const test=samples.slice(split),mae=test.reduce((s,v)=>s+Math.abs(predict(v.x,weights)-v.y),0)/test.length;
  const persistenceMae=test.reduce((s,v)=>s+Math.abs(v.x[1]*100-v.y),0)/test.length;
  const finalWeights=fit(samples)!;const rows=hours.map(h=>({...h})),points:ModelResult['points']=[];
  for(let i=past.length;i<Math.min(rows.length,past.length+48);i++){const x=features(rows,i);if(!x)break;const pm2_5=predict(x,finalWeights);rows[i].pm2_5=pm2_5;points.push({time:rows[i].time,pm2_5});}
  return {method:'Experimental ridge autoregression · 48-hour recursive forecast',samples:samples.length,mae,persistenceMae,points};
}
