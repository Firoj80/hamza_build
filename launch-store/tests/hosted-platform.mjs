// Integration test: creates temporary synthetic users and purchase fixtures, then deletes them.
// No email is sent and no payment is charged. Requires a running local server and configured Supabase secret.
import fs from 'node:fs';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';import {createServerClient} from '@supabase/ssr';
for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_0-9]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const base='http://localhost:3000';const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});const users=[];
try{
 const password=randomBytes(28).toString('hex');
 async function fixture(suffix){const email='platform-fixture-'+randomUUID()+'-'+suffix+'@example.invalid';const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error)throw new Error('Cannot create temporary test account: '+error.message);users.push(data.user.id);const jar=new Map();const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll(){return [...jar].map(([name,value])=>({name,value}));},setAll(values){values.forEach(c=>jar.set(c.name,c.value));}}});const {error:loginError}=await auth.auth.signInWithPassword({email,password});if(loginError)throw new Error('Test sign-in failed: '+loginError.message);return {id:data.user.id,cookie:[...jar].map(([k,v])=>k+'='+encodeURIComponent(v)).join('; ')};}
 const a=await fixture('paid'),b=await fixture('unpaid');const attempt=randomUUID();
 let result=await admin.from('platform_checkout_attempts').insert({id:attempt,user_id:a.id,product_key:'studio',provider_product_id:'pdt_test_fixture',expected_cents:1900});if(result.error)throw result.error;
 result=await admin.rpc('platform_record_payment',{p_attempt_id:attempt,p_payment_id:'test_fixture_'+randomUUID(),p_access_status:'active',p_provider_status:'succeeded'});if(result.error)throw result.error;
 assert.equal((await fetch(base+'/api/workspace')).status,401);console.log('PASS signed-out workspace blocked');
 assert.equal((await fetch(base+'/api/workspace',{headers:{Cookie:b.cookie}})).status,403);console.log('PASS unpaid account blocked');
 const workspace=await fetch(base+'/api/workspace',{headers:{Cookie:a.cookie}});assert.equal(workspace.status,200);const html=await workspace.text();assert(html.includes('PLATFORM_INITIAL_STATE'));assert(!html.includes('localStorage'));assert(!html.includes('.download='));assert.equal(workspace.headers.get('x-frame-options'),'SAMEORIGIN');console.log('PASS paid account opens hosted workspace; no download flow');
 const save=await fetch(base+'/api/workspace-state',{method:'PUT',headers:{Cookie:a.cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({audience:'Private fixture notes',niche:'ai_hustle'})});assert.equal(save.status,200);
 const reloaded=await (await fetch(base+'/api/workspace',{headers:{Cookie:a.cookie}})).text();assert(reloaded.includes('Private fixture notes'));console.log('PASS account progress persists after reload');
 const otherSave=await fetch(base+'/api/workspace-state',{method:'PUT',headers:{Cookie:b.cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({audience:'Unauthorised'})});assert.equal(otherSave.status,403);console.log('PASS unpaid account cannot write workspace');
 assert.equal((await fetch(base+'/api/fieldguide',{headers:{Cookie:a.cookie}})).status,403);console.log('PASS Studio purchase does not unlock Fieldguide');
 for(const p of ['/downloads/first-product-fieldguide.pdf','/Launchpad_Studio.zip','/private/Launchpad_Platform.html'])assert.equal((await fetch(base+p)).status,404);console.log('PASS public product files removed');
}finally{for(const id of users){const {error}=await admin.auth.admin.deleteUser(id);if(error)throw new Error('Temporary account cleanup failed; remove fixture user '+id);}console.log('Temporary test accounts and purchase fixtures removed.');}
