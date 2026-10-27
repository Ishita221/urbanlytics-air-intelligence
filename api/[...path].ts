import type { IncomingMessage,ServerResponse } from 'node:http';
// Vercel serves the React app and this same-origin API gateway. The existing
// Cloudflare Worker remains the durable data/forecast/scenario backend.
const backend='https://urbanlytics-air-intelligence.mellowbrook4097.chatgpt.site';
const endpoints=new Set(['air','places','compare','evidence','history','operations','health','scenarios']);
type Request=IncomingMessage&{body?:unknown};
export default async function handler(req:Request,res:ServerResponse){
 res.setHeader('Cache-Control','private, no-store');
 const fail=(status:number,error:string)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error}));};
 const method=req.method??'GET';
 if(!['GET','POST','DELETE'].includes(method))return fail(405,'Method not allowed.');
 const ownHost=req.headers.host;
 if(!ownHost)return fail(400,'Missing request host.');
 const url=new URL(req.url??'/',`https://${ownHost}`);
 const match=/^\/api\/([a-z]+)\/?$/.exec(url.pathname);
 if(!match||!endpoints.has(match[1]))return fail(404,'API endpoint not found.');
 if(method!=='GET'){
  let origin:URL;try{origin=new URL(String(req.headers.origin));}catch{return fail(403,'Same-origin request required.');}
  if(origin.host!==ownHost || (origin.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(origin.hostname)))return fail(403,'Same-origin request required.');
  if(!String(req.headers['content-type']).startsWith('application/json'))return fail(415,'Use application/json.');
 }
 try{
  let body:Buffer|undefined;
  if(method!=='GET'){
   if(req.body!==undefined)body=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));
   else {const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const buffer=Buffer.from(chunk);size+=buffer.length;if(size>8192)return fail(413,'Request too large.');chunks.push(buffer);}body=Buffer.concat(chunks);}
   if(body.length>8192)return fail(413,'Request too large.');
  }
  const upstream=await fetch(backend+url.pathname+url.search,{method,headers:{Accept:'application/json',...(req.headers.cookie?{Cookie:req.headers.cookie}:{}),...(method!=='GET'?{'Content-Type':'application/json',Origin:backend}:{})},body:body?.toString('utf8'),signal:AbortSignal.timeout(25000),redirect:'error'});
  res.statusCode=upstream.status;
  res.setHeader('Content-Type',upstream.headers.get('content-type')??'application/json');
  const cookies=upstream.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
  const retry=upstream.headers.get('retry-after');if(retry)res.setHeader('Retry-After',retry);
  res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch{return fail(502,'The data backend is temporarily unavailable.');}
}
