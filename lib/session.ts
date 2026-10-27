// Anonymous browser capability; no identity provider or client owner identifiers.
export async function browserOwner(request:Request){
  const secure=new URL(request.url).protocol==='https:';
  const name=secure?'__Host-urban_session':'urban_session_dev';
  const value=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
  const existing=!!value && /^[a-f0-9]{64}$/.test(value);
  const token=existing?value!:Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const id='browser:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return {id,cookie:existing?null:`${name}=${token}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure?'; Secure':''}`};
}
