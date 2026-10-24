import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,createHmac,webcrypto} from 'node:crypto';
import {transform} from 'esbuild';
async function load(path){const source=await readFile(new URL(path,import.meta.url),'utf8');const {code}=await transform(source,{loader:'ts',format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const {createRegistrationSourceHandler}=await load('../base44/shared/registrationSource.ts');
const {emitCurrentUserRegistration}=await load('../base44/shared/partnerRegistration.ts');
const now=Date.parse('2026-10-11T21:00:00.000Z');
const uuid='22222222-2222-4222-8222-222222222222',keyId='test-key',secret='offline-test-only-credential',nonce='a'.repeat(64),timestamp=String(now/1000);
const config={PERKSPHERE_PARTNER_ENABLED:'true',PERKSPHERE_REGISTRATION_SOURCE_ENABLED:'true',PERKSPHERE_REGISTRATION_EVENTS_ENABLED:'true',PERKSPHERE_REGISTRATIONS_AFTER:new Date(now-60000).toISOString(),PERKSPHERE_PARTNER_UUID:uuid,PERKSPHERE_PARTNER_KEY_ID:keyId,PERKSPHERE_PARTNER_HMAC_SECRET:secret};
const user={id:'account-1',created_date:new Date(now-1000).toISOString()};
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const sign=raw=>createHmac('sha256',secret).update(raw).digest('hex');
const canonical=(direction,raw)=>['PERKSPHERE-REGISTRATION-SOURCE-V1',direction,uuid,keyId,timestamp,nonce,hash(raw)].join('\n');
function request(body={action:'registration_lookup',account_reference:'account-1'},headers={}){const raw=JSON.stringify(body);return new Request('https://app.base44.com/source',{method:'POST',body:raw,headers:{'X-PS-Partner-UUID':uuid,'X-PS-Key-ID':keyId,'X-PS-Timestamp':timestamp,'X-PS-Nonce':nonce,'X-PS-Signature':sign(canonical('REQUEST',raw)),...headers}});}
function handler(options={}){return createRegistrationSourceHandler({getSecret:name=>config[name],loadUser:async()=>user,clock:()=>now,cryptoImpl:webcrypto,...options});}
test('source endpoint signs minimal stored registration data and omits private profile fields',async()=>{
 const response=await handler({loadUser:async()=>({...user,email:'private@example.invalid',password:'never-return'})})(request());
 assert.equal(response.status,200);const raw=await response.text();assert.equal(response.headers.get('X-PS-Source-Signature'),sign(canonical('RESPONSE',raw)));assert.equal(response.headers.get('Cache-Control'),'no-store');assert.ok(!raw.includes('private@'));assert.ok(!raw.includes('password'));assert.equal(JSON.parse(raw).data.registered_at,user.created_date);
});
test('disabled source never reads an account',async()=>{
 const response=await handler({getSecret:name=>name==='PERKSPHERE_REGISTRATION_SOURCE_ENABLED'?'false':config[name],loadUser:()=>{throw Error('must not run');}})(request());assert.equal(response.status,503);
});
test('invalid authentication and expired timestamps cannot read source accounts',async()=>{
 for(const headers of [{'X-PS-Signature':'0'.repeat(64)},{'X-PS-Partner-UUID':'other'},{'X-PS-Key-ID':'other'},{'X-PS-Timestamp':String(now/1000-301)}])assert.equal((await handler({loadUser:()=>{throw Error('must not read');}})(request(undefined,headers))).status,401);
});
test('authenticated callers cannot submit account creation time or reward overrides',async()=>{
 for(const change of [{registered_at:user.created_date},{points:100},{user_reference:'someone-else'}])assert.equal((await handler()(request({action:'registration_lookup',account_reference:user.id,...change}))).status,400);
});
test('missing or mismatched stored account cannot yield signed verification data',async()=>{
 for(const value of [null,{...user,id:'other'},{...user,created_date:null}])assert.equal((await handler({loadUser:async()=>value})(request())).status,404);
});
test('oversized source bodies are rejected before reading an account',async()=>{
 assert.equal((await handler()(request({action:'registration_lookup',account_reference:'a'.repeat(5000)}))).status,413);
});
function emitter({change={},settings={},links=[{linux_link_uuid:uuid}],fetchImpl=()=>{throw Error('no network expected');}}={}){return emitCurrentUserRegistration({admin:{entities:{User:{get:async()=>({...user,...change})},PerkSphereLink:{filter:async()=>links}}},userReference:user.id,getSecret:name=>({...config,...settings})[name],clock:()=>now,fetchImpl});}
test('disabled emitter has no account or network effects',async()=>{
 const result=await emitCurrentUserRegistration({getSecret:()=>null,admin:null,userReference:user.id,fetchImpl:()=>{throw Error('no network');}});assert.equal(result.reason,'registration_events_disabled');
});
test('old, future and unlinked accounts do not emit registration events',async()=>{
 for(const change of [{created_date:new Date(now-61000).toISOString()},{created_date:new Date(now+1).toISOString()},{account_status:'banned'}])assert.equal((await emitter({change})).accepted,false);
 assert.equal((await emitter({links:[]})).accepted,false);
 assert.equal((await emitter({settings:{PERKSPHERE_REGISTRATIONS_AFTER:null}})).accepted,false);
});
test('genuine recent registration emits stable source evidence with a valid partner signature',async()=>{
 const result=await emitter({fetchImpl:async(url,options)=>{
  assert.equal(url,'https://api.perksphere.org/v1/partners/events');assert.equal(options.redirect,'error');
  const body=JSON.parse(options.body);assert.equal(body.partner_event_id,'registration:'+user.id);assert.equal(body.occurred_at,user.created_date);assert.deepEqual(body.evidence,{registration_reference:user.id});assert.ok(!('points' in body));
  assert.equal(options.headers['X-PS-Signature'],sign(['POST','/v1/partners/events',options.headers['X-PS-Timestamp'],options.headers['X-PS-Nonce'],hash(options.body)].join('\n')));
  return Response.json({ok:true});
 }});assert.deepEqual(result,{accepted:true});assert.ok(!('issued' in result));
});
test('duplicate transport event is accepted but other provider failures stay pending',async()=>{
 assert.deepEqual(await emitter({fetchImpl:async()=>Response.json({ok:false,error:{code:'duplicate_partner_event'}},{status:409})}),{accepted:true,duplicate:true});
 assert.equal((await emitter({fetchImpl:async()=>Response.json({ok:false},{status:503})})).reason,'registration_event_pending');
});
test('existing DKO link UUID in challenge_id is valid registration evidence',async()=>{
 const result=await emitter({links:[{status:'linked',challenge_id:uuid}]});assert.equal(result.accepted,true);
 const invalid=await emitter({links:[{status:'linked',challenge_id:'not-a-confirmed-uuid'}]});assert.equal(invalid.accepted,false);
});
async function linkHandler(client,emit){
 globalThis.__registrationTestClient=()=>client;
 globalThis.__registrationTestEmitter=emit;
 globalThis.__registrationTestSecret=name=>config[name];
 globalThis.__registrationTestRequest=async(method,path,body)=>{assert.equal(method,'POST');assert.equal(path,'/v1/partner-links/confirm');assert.equal(body.partner_account_reference,user.id);return {ok:true,data:{ok:true,link_uuid:uuid}};};
 let source=await readFile(new URL('../base44/functions/partnerLinkConfirm/entry.ts',import.meta.url),'utf8');
 source=source.replace(/^import[\s\S]*?;\s*/gm,'');
 source='const createClientFromRequest=globalThis.__registrationTestClient;const emitCurrentUserRegistration=globalThis.__registrationTestEmitter;const registrationSecret=globalThis.__registrationTestSecret;const LIVE_ENABLED=true;const getPartnerStatus=()=>({});const perkSphereRequest=globalThis.__registrationTestRequest;\n'+source;
 const {code}=await transform(source,{loader:'ts',format:'esm'});
 return (await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')+'#'+Math.random())).default;
}
test('existing DKO partner link remains successful when optional registration notification fails',async()=>{
 const client={auth:{me:async()=>user},entities:{PerkSphereLink:{filter:async()=>[{status:'linked'}]}},asServiceRole:{}};
 const handler=await linkHandler(client,async()=>{throw Error('optional source unavailable');});
 const result=await handler(new Request('https://test.invalid/link',{method:'POST',body:JSON.stringify({challenge:'a'.repeat(43)})}));
 assert.equal(result.status,200);const body=await result.json();assert.equal(body.linked,true);assert.equal(body.already,true);
});
test('fresh DKO link retains its confirmed UUID when optional registration notification fails',async()=>{
 const calls=[];
 const client={auth:{me:async()=>user},entities:{PerkSphereLink:{filter:async()=>[]}},asServiceRole:{entities:{PerkSphereLink:{create:async record=>calls.push(record)}}}};
 const handler=await linkHandler(client,async()=>{throw Error('optional source unavailable');});
 const result=await handler(new Request('https://test.invalid/link',{method:'POST',body:JSON.stringify({challenge:'a'.repeat(43)})}));
 assert.equal(result.status,200);assert.equal((await result.json()).link_uuid,uuid);assert.equal(calls[0].challenge_id,uuid);assert.equal('challenge' in calls[0],false);
});
