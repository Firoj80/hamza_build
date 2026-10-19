import assert from 'node:assert/strict';
const base='http://localhost:3000';
for(const path of ['/','/support','/privacy','/terms','/login'])assert.equal((await fetch(base+path)).status,200,path);
for(const path of ['/downloads/first-product-fieldguide.pdf','/Launchpad_Studio.zip','/private/Launchpad_Platform.html'])assert.equal((await fetch(base+path)).status,404,path);
for(const path of ['/api/workspace','/api/fieldguide'])assert.equal((await fetch(base+path)).status,401,path);
const forged=await fetch(base+'/order?payment_id=pay_forged&status=succeeded');assert(forged.url.includes('/login'));
const foreign=await fetch(base+'/api/checkout',{method:'POST',headers:{Origin:'https://attacker.example'}});assert.equal(foreign.status,403);
const signedOut=await fetch(base+'/api/checkout',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({product:'studio'})});assert.equal(signedOut.status,401);
console.log('PASS public pages, private files, authentication and checkout origin checks');
