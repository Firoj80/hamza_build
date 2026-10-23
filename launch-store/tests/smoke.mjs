import assert from 'node:assert/strict';
const base='http://localhost:3000';
for(const path of ['/','/support','/privacy','/terms','/login','/products/first-product-fieldguide','/products/launchpad-studio'])assert.equal((await fetch(base+path)).status,200,path);
const guideHtml=await (await fetch(base+'/products/first-product-fieldguide')).text();
const studioHtml=await (await fetch(base+'/products/launchpad-studio')).text();
assert(guideHtml.includes('/images/idea-to-income-fieldguide-og.png')&&!guideHtml.includes('/images/launchpad-studio-og.png'),'fieldguide page must use its own OG cover image');
assert(studioHtml.includes('/images/launchpad-studio-og.png')&&!studioHtml.includes('/images/idea-to-income-fieldguide-og.png'),'studio page must use its own OG cover image');
for(const img of ['/images/idea-to-income-fieldguide-og.png','/images/launchpad-studio-og.png']){const r=await fetch(base+img);assert.equal(r.status,200,img);assert((r.headers.get('content-type')||'').includes('image/png'),img);}
for(const path of ['/downloads/first-product-fieldguide.pdf','/Launchpad_Studio.zip','/private/Launchpad_Platform.html'])assert.equal((await fetch(base+path)).status,404,path);
for(const path of ['/api/workspace','/api/fieldguide'])assert.equal((await fetch(base+path)).status,401,path);
for(const path of ['/api/download?product=fieldguide','/api/download?product=studio'])assert.equal((await fetch(base+path)).status,403,path);
const forged=await fetch(base+'/order?payment_id=pay_forged&status=succeeded');assert.equal(forged.status,200);const forgedText=await forged.text();assert(!forgedText.includes('PAYMENT VERIFIED · INSTANT DOWNLOAD READY'),'forged redirect parameters must never unlock downloads');
const foreign=await fetch(base+'/api/checkout',{method:'POST',headers:{Origin:'https://attacker.example'}});assert.equal(foreign.status,403);
console.log('PASS public pages, product OG/Twitter social previews, private files, download protection, forged redirect rejection, and checkout origin checks');
