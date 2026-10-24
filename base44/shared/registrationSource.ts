const DOMAIN='PERKSPHERE-REGISTRATION-SOURCE-V1';
const enc=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export function createRegistrationSourceHandler({getSecret,loadUser,clock=Date.now,cryptoImpl=globalThis.crypto}) {
 return async req=>{
  const fail=(status)=>Response.json({ok:false,error:'registration_source_unavailable'},{status,headers:{'Cache-Control':'no-store'}});
  try {
   if(req.method!=='POST')return fail(405);
   if(getSecret('PERKSPHERE_PARTNER_ENABLED')!=='true'||getSecret('PERKSPHERE_REGISTRATION_SOURCE_ENABLED')!=='true')return fail(503);
   const partnerUuid=getSecret('PERKSPHERE_PARTNER_UUID'),keyId=getSecret('PERKSPHERE_PARTNER_KEY_ID'),secret=getSecret('PERKSPHERE_PARTNER_HMAC_SECRET');
   const timestamp=req.headers.get('X-PS-Timestamp'),nonce=req.headers.get('X-PS-Nonce'),sig=req.headers.get('X-PS-Signature');
   if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(partnerUuid||'')||!keyId||typeof secret!=='string'||secret.length<16)return fail(503);
   if(req.headers.get('X-PS-Partner-UUID')!==partnerUuid||req.headers.get('X-PS-Key-ID')!==keyId||!/^\d{10}$/.test(timestamp||'')||Math.abs(clock()/1000-Number(timestamp))>300||! /^[a-f0-9]{64}$/.test(nonce||'')||! /^[a-f0-9]{64}$/.test(sig||''))return fail(401);
   if(Number(req.headers.get('content-length'))>4096)return fail(413);
   const reader=req.body?.getReader();if(!reader)return fail(400);
   const chunks=[];let length=0;
   try {while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>4096)return fail(413);chunks.push(part.value);}}
   finally{await reader.cancel().catch(()=>{});}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
   const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   const key=await cryptoImpl.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
   const canonical=async(direction,body)=>[DOMAIN,direction,partnerUuid,keyId,timestamp,nonce,hex(await cryptoImpl.subtle.digest('SHA-256',enc.encode(body)))].join('\n');
   const signatureBytes=Uint8Array.from(sig.match(/../g),pair=>parseInt(pair,16));
   if(!await cryptoImpl.subtle.verify('HMAC',key,signatureBytes,enc.encode(await canonical('REQUEST',raw))))return fail(401);
   const body=JSON.parse(raw);
   if(!body||Object.keys(body).sort().join(',')!=='account_reference,action'||body.action!=='registration_lookup'||! /^[A-Za-z0-9_-]{1,191}$/.test(body.account_reference||''))return fail(400);
   let user;try{user=await loadUser(body.account_reference,req);}catch{return fail(404);}
   if(!user||user.id!==body.account_reference||typeof user.created_date!=='string'||!Number.isFinite(Date.parse(user.created_date)))return fail(404);
   const response=JSON.stringify({ok:true,data:{partner_uuid:partnerUuid,account_reference:user.id,registration_reference:user.id,registered_at:user.created_date,account_status:user.account_status||'active'}});
   const signed=hex(await cryptoImpl.subtle.sign('HMAC',key,enc.encode(await canonical('RESPONSE',response))));
   return new Response(response,{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-PS-Source-Signature':signed}});
  }catch{return fail(503);}
 };
}