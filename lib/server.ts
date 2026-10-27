import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { pollutants, type AirData, type Hour, type Place } from './domain';
import { trainForecast } from './model';
export const placeSchema=z.object({name:z.string().trim().min(1).max(90),latitude:z.coerce.number().finite().min(-90).max(90),longitude:z.coerce.number().finite().min(-180).max(180)});
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
export function database(){if(!env.DB)throw new ApiError(503,'Database unavailable. Please retry shortly.');return env.DB;}
export async function rateLimit(request:Request, scope:string, limit=60){
  const now=Math.floor(Date.now()/1000),window=Math.floor(now/60);
  const ip=request.headers.get('cf-connecting-ip') || 'local';
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
  const key=scope+':'+Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')+':'+window;
  const row=await database().prepare('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+120).first<{count:number}>();
  if(row && row.count>limit)throw new ApiError(429,'Too many requests. Please wait a minute.');
  if(Math.random()<0.02) await database().prepare('DELETE FROM rate_limits WHERE expires < ?').bind(now).run();
}
export function assertOrigin(request:Request){const origin=request.headers.get('origin');if(!origin || origin!==new URL(request.url).origin)throw new ApiError(403,'This action requires a same-origin request.');}
export async function bodyJson(request:Request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError(415,'Use application/json.');
  if(Number(request.headers.get('content-length'))>8192)throw new ApiError(413,'Request too large.');
  const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'Missing JSON body.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();throw new ApiError(413,'Request too large.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new ApiError(400,'Invalid JSON.');}
}
export function fail(error:unknown){const status=error instanceof z.ZodError?400:error instanceof ApiError?error.status:503;const message=error instanceof z.ZodError?'Invalid request parameters.':error instanceof ApiError?error.message:'Service temporarily unavailable. Please try again.';return Response.json({error:message},{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});}
const field=z.array(z.number().finite().nullable());
const responseSchema=z.object({timezone:z.string(),hourly:z.object({time:z.array(z.number())}).catchall(field)});
export async function upstream(url:string){
  for(let attempt=0;attempt<2;attempt++){
    try{const response=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});if(!response.ok){if(response.status<500 && response.status!==429)throw new ApiError(502,'The data provider rejected the request.');throw new Error('Provider busy');}return await response.json();}
    catch(error){if(error instanceof ApiError || attempt===1)throw new ApiError(502,'Live data provider unavailable. No substitute data has been generated.');}
  }
}
function nullable(v:unknown):number|null{return typeof v==='number' && Number.isFinite(v)?v:null;}
const flights=new Map<string,Promise<AirData>>();
export async function getAir(place:Place):Promise<AirData>{
  const key=place.latitude.toFixed(3)+','+place.longitude.toFixed(3),db=database(),now=Date.now();
  const cached=await db.prepare('SELECT payload,fetched_at FROM air_cache WHERE key=?').bind(key).first<{payload:string;fetched_at:number}>();
  if(cached && now-cached.fetched_at<600000)return {...JSON.parse(cached.payload),place,cache:'cached'};
  const pending=flights.get(key);if(pending)return {...await pending,place};
  const flight=(async()=>{
    try{
      const query=new URLSearchParams({latitude:place.latitude.toFixed(3),longitude:place.longitude.toFixed(3),timezone:'auto',timeformat:'unixtime',past_days:'7',forecast_days:'5'});
      const aqFields=['us_aqi',...pollutants];const weatherFields=['temperature_2m','relative_humidity_2m','wind_speed_10m'];
      const [airRaw,weatherRaw]=await Promise.all([upstream('https://air-quality-api.open-meteo.com/v1/air-quality?'+query+'&hourly='+aqFields.join(',')),upstream('https://api.open-meteo.com/v1/forecast?'+query+'&hourly='+weatherFields.join(','))]);
      const air=responseSchema.parse(airRaw),weather=responseSchema.parse(weatherRaw),weatherIndex=new Map(weather.hourly.time.map((v,i)=>[v,i]));
      for(const f of aqFields)if(!Array.isArray(air.hourly[f]) || air.hourly[f].length!==air.hourly.time.length)throw new Error('Incomplete air response');
      for(const f of weatherFields)if(!Array.isArray(weather.hourly[f]) || weather.hourly[f].length!==weather.hourly.time.length)throw new Error('Incomplete weather response');
      const hours:Hour[]=air.hourly.time.map((time,i)=>{const h:Record<string,number|null>={time};for(const f of aqFields)h[f]=nullable(air.hourly[f][i]);const wi=weatherIndex.get(time);for(const f of weatherFields)h[f]=wi===undefined?null:nullable(weather.hourly[f][wi]);return h as Hour;});
      const current=hours.filter(h=>h.time<=now/1000 && h.us_aqi!==null).at(-1);if(!current || now/1000-current.time>7200)throw new Error('No timely current values');
      const data:AirData={place,fetchedAt:now,validAt:current.time,timezone:air.timezone,current,hours,cache:'fresh',model:trainForecast(hours,current.time),provenance:{provider:'CAMS / Open-Meteo',type:'Atmospheric model output; not a ground-station measurement',resolution:'Global CAMS ~45 km; Europe ~11 km. Interpolated hourly.',aqiStandard:'US AQI (provider supplied); not CPCB India AQI',url:'https://open-meteo.com/en/docs/air-quality-api'}};
      await db.prepare('INSERT INTO air_cache (key,payload,fetched_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at').bind(key,JSON.stringify(data),now).run();
      return data;
    }catch(error){if(cached && now-cached.fetched_at<6*3600000)return {...JSON.parse(cached.payload),place,cache:'stale' as const,warning:'Provider unavailable. Showing a stored response; check its timestamp.'};if(error instanceof z.ZodError)throw new ApiError(502,'The provider returned an invalid data response.');throw error;}
  })();
  flights.set(key,flight);try{return await flight;}finally{flights.delete(key);}
}
