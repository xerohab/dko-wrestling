const enc=new TextEncoder();
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export async function emitCurrentUserRegistration({admin,userReference,getSecret,fetchImpl=fetch,clock=Date.now}) {
 if(getSecret('PERKSPHERE_PARTNER_ENABLED')!=='true'||getSecret('PERKSPHERE_REGISTRATION_EVENTS_ENABLED')!=='true')return {accepted:false,reason:'registration_events_disabled'};
 const now=clock(),cutoffText=getSecret('PERKSPHERE_REGISTRATIONS_AFTER'),cutoff=Date.parse(cutoffText||'');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cutoffText||'')||!Number.isFinite(cutoff)||new Date(cutoff).toISOString()!==cutoffText||cutoff>now)return {accepted:false,reason:'registration_cutoff_required'};
 const user=await admin.entities.User.get(userReference),created=Date.parse(user?.created_date);
 if(user?.id!==userReference||!Number.isFinite(created)||created<cutoff||created<now-86400000||created>now||(user.account_status&&user.account_status!=='active'))return {accepted:false,reason:'new_registration_required'};
 const links=await admin.entities.PerkSphereLink.filter({user_id:userReference,status:'linked'});
 if(links.length!==1||! /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test((links[0].linux_link_uuid??links[0].challenge_id)||''))return {accepted:false,reason:'verified_link_required'};
 const uuid=getSecret('PERKSPHERE_PARTNER_UUID'),keyId=getSecret('PERKSPHERE_PARTNER_KEY_ID'),secret=getSecret('PERKSPHERE_PARTNER_HMAC_SECRET');
 if(! /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(uuid||'')||!keyId||!secret)return {accepted:false,reason:'partner_configuration_required'};
 const path='/v1/partners/events',timestamp=String(Math.floor(now/1000)),nonce=hex(crypto.getRandomValues(new Uint8Array(32)));
 const raw=JSON.stringify({event_type:'registration_completed',partner_event_id:'registration:'+user.id,partner_account_reference:user.id,occurred_at:new Date(created).toISOString(),evidence:{registration_reference:user.id}});
 const digest=hex(await crypto.subtle.digest('SHA-256',enc.encode(raw)));
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=hex(await crypto.subtle.sign('HMAC',key,enc.encode(['POST',path,timestamp,nonce,digest].join('\n'))));
 const response=await fetchImpl('https://api.perksphere.org'+path,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','X-PS-Key-ID':keyId,'X-PS-Timestamp':timestamp,'X-PS-Nonce':nonce,'X-PS-Signature':sig},body:raw});
 const data=await response.json().catch(()=>null);
 if(response.ok&&data?.ok===true)return {accepted:true};
 if(response.status===409&&data?.error?.code==='duplicate_partner_event')return {accepted:true,duplicate:true};
 return {accepted:false,reason:'registration_event_pending'};
}