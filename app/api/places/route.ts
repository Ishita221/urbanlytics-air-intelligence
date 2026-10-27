import { z } from 'zod';
import { rateLimit, fail, upstream } from '@/lib/server';
const schema=z.object({results:z.array(z.object({name:z.string(),latitude:z.number(),longitude:z.number(),country:z.string().optional(),admin1:z.string().optional()})).optional()});
export async function GET(request:Request){try{await rateLimit(request,'search',30);const q=z.string().trim().min(2).max(80).parse(new URL(request.url).searchParams.get('q'));const data=schema.parse(await upstream('https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name='+encodeURIComponent(q)));return Response.json({places:(data.results||[]).map(p=>({...p,name:p.name+(p.admin1?', '+p.admin1:'')}))});}catch(e){return fail(e);}}
