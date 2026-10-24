import {createClientFromRequest} from 'npm:@base44/sdk@0.8.52';
import {createRegistrationSourceHandler} from '../../shared/registrationSource.ts';
import {registrationSecret} from '../../shared/partnerRegistrationConfig.ts';
Deno.serve(createRegistrationSourceHandler({
 getSecret:registrationSecret,
 loadUser:(reference,req)=>createClientFromRequest(req).asServiceRole.entities.User.get(reference)
}));
