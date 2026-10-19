// Real auth integration using a temporary synthetic account. No emails or charges.
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const base='http://localhost:3000';
const email='password-fixture-'+randomUUID()+'@example.com';
const password=randomBytes(24).toString('hex');
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const settings=await (await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}})).json();
assert.equal(settings.mailer_autoconfirm,true,'Confirm email must be disabled; do not send fixture email');
let cookie='';
async function post(path,body,origin=base){const r=await fetch(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body),redirect:'manual'});const values=r.headers.getSetCookie();if(values.length)cookie=values.map(v=>v.split(';')[0]).join('; ');return r;}
try{
 assert.equal((await post('/auth/login',{mode:'signup',email,password},'https://other.example')).status,403);
 assert.equal((await post('/auth/login',{mode:'signup',email,password:'short'})).status,400);
 const signup=await post('/auth/login',{mode:'signup',email,password,next:'/library?buy=studio'});
 assert.equal(signup.status,200);assert.equal((await signup.json()).url,'/library?buy=studio');assert(cookie.includes('auth-token'));
 const library=await fetch(base+'/library',{headers:{Cookie:cookie},redirect:'manual'});assert.equal(library.status,200);assert((await library.text()).includes(email));console.log('PASS signup signs in immediately without email verification');
 assert.equal((await fetch(base+'/api/workspace',{headers:{Cookie:cookie}})).status,403);console.log('PASS new account does not bypass paid access');
 assert.equal((await post('/auth/logout',{})).status,303);cookie='';
 assert.equal((await post('/auth/login',{mode:'login',email,password:'wrong-password'})).status,400);
 const login=await post('/auth/login',{mode:'login',email,password,next:'https://evil.example'});assert.equal(login.status,200);assert.equal((await login.json()).url,'/library');console.log('PASS password login, wrong-password rejection and safe redirects');
 assert.equal((await fetch(base+'/account/password',{headers:{Cookie:cookie},redirect:'manual'})).status,200);
 const nextPassword=randomBytes(24).toString('hex');assert.equal((await post('/auth/password',{password:nextPassword})).status,200);
 await post('/auth/logout',{});cookie='';
 assert.equal((await post('/auth/login',{mode:'login',email,password:nextPassword})).status,200);console.log('PASS signed-in account can set a password and use it to sign in');
 await post('/auth/logout',{});cookie='';assert.equal((await post('/auth/password',{password:nextPassword})).status,401);
}finally{
 const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;
 const user=data.users.find(u=>u.email===email);if(user){const result=await admin.auth.admin.deleteUser(user.id);if(result.error)throw result.error;}
 console.log('Temporary password test account removed.');
}
