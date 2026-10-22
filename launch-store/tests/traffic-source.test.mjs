import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 TRAFFIC_SOURCES,
 classifyTrafficSource,
 encodeVisitorHashWithSource,
 decodeSourceFromVisitorHash,
 resolvePageviewTrafficSource
} from '../lib/traffic-source.mjs';

test('classifies traffic sources from referrers and query params',()=>{
 assert.equal(classifyTrafficSource({referrer:'https://www.threads.net/@hamza'}),'threads');
 assert.equal(classifyTrafficSource({referrer:'https://www.threads.com/t/123'}),'threads');
 assert.equal(classifyTrafficSource({referrer:'https://l.threads.net/?u=https%3A%2F%2Fbuild-hamza.vercel.app'}),'threads');
 assert.equal(classifyTrafficSource({search:'?utm_source=threads'}),'threads');
 assert.equal(classifyTrafficSource({search:'?via=threads'}),'threads');

 assert.equal(classifyTrafficSource({referrer:'https://t.co/xyz123'}),'x');
 assert.equal(classifyTrafficSource({referrer:'https://x.com/hamza'}),'x');
 assert.equal(classifyTrafficSource({search:'?ref=twitter'}),'x');
 assert.equal(classifyTrafficSource({search:'?twclid=tw123'}),'x');
 assert.equal(classifyTrafficSource({search:'?s=20&t=abc'}),'x');

 assert.equal(classifyTrafficSource({referrer:'https://www.facebook.com/'}),'facebook');
 assert.equal(classifyTrafficSource({referrer:'https://l.facebook.com/l.php?u=test'}),'facebook');
 assert.equal(classifyTrafficSource({referrer:'https://m.facebook.com/'}),'facebook');
 assert.equal(classifyTrafficSource({search:'?fbclid=IwAR12345'}),'facebook');
 assert.equal(classifyTrafficSource({search:'?via=fb'}),'facebook');

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

test('detects mobile in-app browsers and android-app referrers when document.referrer is stripped',()=>{
 // Threads iOS / Android in-app browser (codename Barcelona)
 assert.equal(
  classifyTrafficSource({
   referrer:'',
   search:'?fbclid=IwAR_threads',
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 331.0.0.0.0 Barcelona 331.0.0.0.0'
  }),
  'threads'
 );
 assert.equal(
  classifyTrafficSource({
   referrer:'android-app://com.instagram.barcelona/'
  }),
  'threads'
 );

 // X iOS / Android in-app browser
 assert.equal(
  classifyTrafficSource({
   referrer:'',
   userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36 TwitterAndroid'
  }),
  'x'
 );
 assert.equal(
  classifyTrafficSource({
   referrer:'android-app://com.twitter.android/'
  }),
  'x'
 );

 // Facebook iOS / Android in-app browser
 assert.equal(
  classifyTrafficSource({
   referrer:'',
   userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) [FBAN/FBIOS;FBAV/460.0.0.0;FBBV/12345]'
  }),
  'facebook'
 );
 assert.equal(
  classifyTrafficSource({
   referrer:'android-app://com.facebook.katana/'
  }),
  'facebook'
 );

 // Does not let sourceParam="direct" override server-detected query params or UA
 assert.equal(
  classifyTrafficSource({
   sourceParam:'direct',
   referrer:'https://build-hamza.vercel.app/products/launchpad-studio?fbclid=IwAR999',
   currentOrigin:'https://build-hamza.vercel.app'
  }),
  'facebook'
 );
 assert.equal(
  classifyTrafficSource({
   sourceParam:'direct',
   referrer:'https://build-hamza.vercel.app/products/launchpad-studio',
   userAgent:'Mozilla/5.0 (iPhone) Barcelona 331.0.0',
   currentOrigin:'https://build-hamza.vercel.app'
  }),
  'threads'
 );
});

test('encodes and decodes traffic sources in 64-char hex visitor_hash',()=>{
 const baseHash='a'.repeat(64);
 for(const src of TRAFFIC_SOURCES){
  const encoded=encodeVisitorHashWithSource(baseHash,src.key);
  assert.match(encoded,/^[a-f0-9]{64}$/);
  assert.equal(decodeSourceFromVisitorHash(encoded),src.key);
  assert.equal(resolvePageviewTrafficSource(encoded),src.key);
 }
 assert.equal(decodeSourceFromVisitorHash(baseHash),'direct');
 assert.ok(['threads','x','facebook'].includes(resolvePageviewTrafficSource(baseHash)));
});

