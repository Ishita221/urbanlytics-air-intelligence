import { database, fail } from '@/lib/server';
export async function GET(){try{await database().prepare('SELECT 1 AS ok').first();return Response.json({status:'ok',database:'connected',service:'urbanlytics',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
