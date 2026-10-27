import { getAir, placeSchema, rateLimit, fail } from '@/lib/server';
export async function GET(request:Request){try{await rateLimit(request,'air');const place=placeSchema.parse(Object.fromEntries(new URL(request.url).searchParams));return Response.json(await getAir(place),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return fail(e);}}
