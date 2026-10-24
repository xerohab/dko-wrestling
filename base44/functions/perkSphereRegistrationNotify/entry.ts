import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {emitCurrentUserRegistration} from '../../shared/partnerRegistration.ts';
import {registrationSecret} from '../../shared/partnerRegistrationConfig.ts';
Deno.serve(async req=>{
 const headers={'Cache-Control':'no-store'};
 if(req.method!=='POST')return Response.json({ok:false},{status:405,headers});
 try{
  const client=createClientFromRequest(req),user=await client.auth.me().catch(()=>null);
  if(!user?.id)return Response.json({ok:false},{status:401,headers});
  const body=await req.json();if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length)return Response.json({ok:false},{status:400,headers});
  const data=await emitCurrentUserRegistration({admin:client.asServiceRole,userReference:user.id,getSecret:registrationSecret});
  return Response.json({ok:true,data},{headers});
 }catch{return Response.json({ok:false,error:'registration_event_unavailable'},{status:503,headers});}
});
