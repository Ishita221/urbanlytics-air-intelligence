import { env } from 'cloudflare:workers';
import { z } from 'zod';
import type { Place } from './domain';
export function csvRows(text:string){
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('Invalid CSV');if(cell||row.length){row.push(cell);rows.push(row);}const headers=rows.shift()||[];return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
export function distanceKm(a:number,b:number,c:number,d:number){const rad=Math.PI/180,x=Math.sin((c-a)*rad/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin((d-b)*rad/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
async function json(url:string,key:string){const r=await fetch(url,{headers:{'X-API-Key':key,Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('Provider request failed');return r.json();}
const sensor=z.object({id:z.number(),parameter:z.object({name:z.string(),units:z.string()})});
const locations=z.object({results:z.array(z.object({id:z.number(),name:z.string(),distance:z.number().optional(),provider:z.object({name:z.string()}).optional(),sensors:z.array(sensor)}))});
const latest=z.object({results:z.array(z.object({sensorsId:z.number(),value:z.number().finite(),datetime:z.object({utc:z.string()})}))});
export async function stationEvidence(place:Place){
 if(!env.OPENAQ_API_KEY)return {status:'key_required',stations:[],note:'Configure the server secret OPENAQ_API_KEY to query nearby ground stations.'};
 try{const found=locations.parse(await json('https://api.openaq.org/v3/locations?coordinates='+place.latitude+','+place.longitude+'&radius=25000&limit=5',env.OPENAQ_API_KEY));
 const stations=await Promise.all(found.results.map(async s=>{try{const data=latest.parse(await json('https://api.openaq.org/v3/locations/'+s.id+'/latest',env.OPENAQ_API_KEY!));return {id:s.id,name:s.name,provider:s.provider?.name??'OpenAQ',distance:s.distance??null,measurements:data.results.filter(v=>v.value>=0).map(v=>{const param=s.sensors.find(x=>x.id===v.sensorsId)?.parameter;return {parameter:param?.name??'Unknown',units:param?.units??'',value:v.value,time:v.datetime.utc,stale:Date.now()-Date.parse(v.datetime.utc)>3*3600000};})};}catch{return {id:s.id,name:s.name,provider:s.provider?.name??'OpenAQ',distance:s.distance??null,measurements:[],error:'Latest readings unavailable'};}}));
 return {status:'connected',stations,note:'Up to five stations within 25 km. Latest readings may be delayed; this is not complete historical coverage.'};
 }catch{return {status:'unavailable',stations:[],note:'OpenAQ is configured but its request failed. No station readings were substituted.'};}
}
export async function fireEvidence(place:Place){
 if(!env.FIRMS_MAP_KEY)return {status:'key_required',fires:[],note:'Configure the server secret FIRMS_MAP_KEY to query NASA VIIRS fire detections.'};
 try{const west=Math.max(-180,place.longitude-1.5),east=Math.min(180,place.longitude+1.5),south=Math.max(-90,place.latitude-1.5),north=Math.min(90,place.latitude+1.5);const url='https://firms.modaps.eosdis.nasa.gov/api/area/csv/'+encodeURIComponent(env.FIRMS_MAP_KEY)+'/VIIRS_NOAA20_NRT/'+[west,south,east,north].join(',')+'/1';const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Unavailable');const text=await r.text();if(text.length>2000000||!text.startsWith('latitude,'))throw new Error('Invalid response');
 const fires=csvRows(text).map(row=>({latitude:Number(row.latitude),longitude:Number(row.longitude),date:row.acq_date,time:row.acq_time,confidence:row.confidence,frp:Number(row.frp)})).filter(v=>Number.isFinite(v.latitude)&&Number.isFinite(v.longitude)&&v.date).map(v=>({...v,distanceKm:distanceKm(place.latitude,place.longitude,v.latitude,v.longitude)})).filter(v=>v.distanceKm<=150).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,100);
 return {status:'connected',fires,note:'VIIRS NOAA-20 detections over the provider’s last-day window, within 150 km. A hotspot does not prove stubble burning or a pollution contribution.'};
 }catch{return {status:'unavailable',fires:[],note:'FIRMS is configured but its response could not be used. No fires were generated.'};}
}
