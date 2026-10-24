import {secrets} from 'base44:runtime';
import {LIVE_ENABLED,PERKSPHERE_PARTNER_UUID} from './perkSphereClient.ts';
// Reuse the existing partner identity and credential. Never reprovision here.
export function registrationSecret(name){
 if(name==='PERKSPHERE_PARTNER_ENABLED')return LIVE_ENABLED?'true':'false';
 if(name==='PERKSPHERE_PARTNER_UUID')return PERKSPHERE_PARTNER_UUID;
 return secrets.get(name);
}
