import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 TRAFFIC_SOURCES,
 classifyTrafficSource,
 encodeVisitorHashWithSource,
 decodeSourceFromVisitorHash
} from '../lib/traffic-source.mjs';

test('classifies traffic sources from referrers and query params',()=>{
 assert.equal(classifyTrafficSource({referrer:'https://www.threads.net/@hamza'}),'threads');
 assert.equal(classifyTrafficSource({referrer:'https://www.threads.com/t/123'}),'threads');
 assert.equal(classifyTrafficSource({search:'?utm_source=threads'}),'threads');

 assert.equal(classifyTrafficSource({referrer:'https://t.co/xyz123'}),'x');
 assert.equal(classifyTrafficSource({referrer:'https://x.com/hamza'}),'x');
 assert.equal(classifyTrafficSource({search:'?ref=twitter'}),'x');

 assert.equal(classifyTrafficSource({referrer:'https://in.pinterest.com/pin/123/'}),'pinterest');
 assert.equal(classifyTrafficSource({referrer:'https://pin.it/abc'}),'pinterest');
 assert.equal(classifyTrafficSource({search:'?utm_source=pintrest'}),'pinterest');

 assert.equal(classifyTrafficSource({referrer:'https://medium.com/@hamza/story'}),'medium');
 assert.equal(classifyTrafficSource({search:'?utm_source=medium'}),'medium');

 assert.equal(classifyTrafficSource({referrer:'https://www.google.com/search?q=launchpad'}),'google');
 assert.equal(classifyTrafficSource({search:'?gclid=test123'}),'google');

 assert.equal(classifyTrafficSource({referrer:'',search:''}),'direct');
 assert.equal(
  classifyTrafficSource({
   referrer:'https://build-hamza.vercel.app/products/launchpad-studio',
   currentOrigin:'https://build-hamza.vercel.app'
  }),
  'direct'
 );
});

test('encodes and decodes traffic sources in 64-char hex visitor_hash',()=>{
 const baseHash='a'.repeat(64);
 for(const src of TRAFFIC_SOURCES){
  const encoded=encodeVisitorHashWithSource(baseHash,src.key);
  assert.match(encoded,/^[a-f0-9]{64}$/);
  assert.equal(decodeSourceFromVisitorHash(encoded),src.key);
 }
 assert.equal(decodeSourceFromVisitorHash(baseHash),'direct');
});
