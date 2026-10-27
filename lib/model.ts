import type { Hour, ModelResult } from './domain';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
function features(rows: Hour[], i: number): number[] | null {
  const h = rows[i], a=rows[i-1], b=rows[i-24], c=rows[i-48];
  if (!h || !a || !b || !c || ![a.pm2_5,b.pm2_5,c.pm2_5,h.temperature_2m,h.wind_speed_10m,h.relative_humidity_2m].every(finite)) return null;
  if(h.time-a.time!==3600 || h.time-b.time!==86400 || h.time-c.time!==172800)return null;
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
const predict=(x:number[],w:number[])=>Math.max(0,Math.min(2000,x.reduce((s,v,i)=>s+v*w[i],0)));
function samplesBefore(rows:Hour[],end:number){const a:{x:number[];y:number}[]=[];for(let i=48;i<end;i++){const x=features(rows,i);if(x && finite(rows[i].pm2_5))a.push({x,y:rows[i].pm2_5!});}return a;}
function recursive(rows:Hour[],origin:number,count:number,weights:number[],method:string){
 const copy=rows.map(h=>({...h})),out:number[]=[];
 for(let i=origin;i<Math.min(copy.length,origin+count);i++){
  const x=features(copy,i);if(!x)break;
  const value=method==='persistence'?copy[i-1].pm2_5:method==='seasonal'?copy[i-24].pm2_5:predict(x,weights);
  if(!finite(value))break;copy[i].pm2_5=value;out.push(value);
 }return out;
}
export function trainForecast(hours:Hour[],validAt:number):ModelResult{
 const past=hours.filter(h=>h.time<=validAt),samples=samplesBefore(past,past.length);
 if(samples.length<60)return {method:'Insufficient complete history',samples:samples.length,mae:null,persistenceMae:null,points:[],validation:[]};
 const holdout=24,w=fit(samples.slice(0,-holdout));if(!w)return {method:'Regression unavailable',samples:samples.length,mae:null,persistenceMae:null,points:[],validation:[]};
 const test=samples.slice(-holdout),mae=test.reduce((s,v)=>s+Math.abs(predict(v.x,w)-v.y),0)/test.length,persistenceMae=test.reduce((s,v)=>s+Math.abs(v.x[1]*100-v.y),0)/test.length;
 const errors:Record<string,Record<number,number[]>>={ridge:{6:[],12:[],24:[]},persistence:{6:[],12:[],24:[]},seasonal:{6:[],12:[],24:[]}};
 for(let origin=Math.max(120,past.length-144);origin<=past.length-24;origin+=6){
  const sw=fit(samplesBefore(past,origin));if(!sw)continue;
  for(const method of ['ridge','persistence','seasonal']){
   const prediction=recursive(past,origin,24,sw,method);
   for(const h of [6,12,24]){const target=past[origin+h-1]?.pm2_5;if(finite(target)&&finite(prediction[h-1]))errors[method][h].push(Math.abs(prediction[h-1]-target));}
  }
 }
 const mean=(x:number[])=>x.length?x.reduce((s,v)=>s+v,0)/x.length:null;
 const candidates=['ridge','persistence','seasonal'].filter(m=>errors[m][24].length>=3).sort((a,b)=>mean(errors[a][24])!-mean(errors[b][24])!);
 const selected=candidates[0]??'ridge';
 const validation=[6,12,24].map(h=>{const e=[...errors[selected][h]].sort((a,b)=>a-b);return {horizon:h,folds:e.length,ridgeMae:mean(errors.ridge[h]),persistenceMae:mean(errors.persistence[h]),seasonalMae:mean(errors.seasonal[h]),selectedMae:mean(e),radius80:e.length>=5?e[Math.min(e.length-1,Math.ceil((e.length+1)*.8)-1)]:null};});
 const finalWeights=fit(samples)!;const predictions=recursive(hours,past.length,48,finalWeights,selected);
 const points=predictions.map((pm2_5,i)=>{const band=validation.find(v=>i+1<=v.horizon);const radius=band?.radius80??null;return {time:hours[past.length+i].time,pm2_5,lower:radius===null?null:Math.max(0,pm2_5-radius),upper:radius===null?null:pm2_5+radius};});
 return {method:'Rolling-origin comparison: ridge, persistence and daily seasonal baseline',selected,samples:samples.length,mae,persistenceMae,validation,points};
}
