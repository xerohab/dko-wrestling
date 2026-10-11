import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { signRequest, EXPECTED_KEY_ID } from '../base44/shared/perkSphereClient.ts';
import unlink from '../base44/functions/partnerUnlink/entry.ts';
import submit from '../base44/functions/partnerSubmitEvent/entry.ts';
const post=body=>new Request('https://example.test/function',{method:'POST',body:JSON.stringify(body)});
test('partner HMAC matches Linux canonical bytes and nonce character contract',async()=>{
 const creds={keyId:EXPECTED_KEY_ID,hmacSecret:'test secret'};
 for(let i=0;i<50;i++){
  const body='{"text":"£"}';const h=await signRequest('POST','/v1/partners/events',body,creds);
  assert.match(h['X-PS-Nonce'],/^[A-Za-z0-9_-]{43}$/);
  const canonical=['POST','/v1/partners/events',h['X-PS-Timestamp'],h['X-PS-Nonce'],createHash('sha256').update(body).digest('hex')].join('\n');
  assert.equal(h['X-PS-Signature'],createHmac('sha256',creds.hmacSecret).update(canonical).digest('hex'));
 }
});
test('unlink retains verified link until authoritative revocation',async()=>{
 let writes=0;globalThis.__testClient={auth:{me:async()=>({id:'member'})},entities:{PerkSphereLink:{filter:async()=>[{id:'link',status:'linked'}],update:async()=>writes++}}};
 assert.equal((await unlink(post({}))).status,409);assert.equal(writes,0);
});
test('member cannot sign self-reported trusted activity',async()=>{
 globalThis.__testClient={auth:{me:async()=>({id:'member',role:'user'})}};assert.equal((await submit(post({event_type:'registration_completed'}))).status,403);
});
