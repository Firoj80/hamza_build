import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configuredSiteOrigin,siteOrigin,allowedCheckoutUrl,ownsPayment,validPaymentId} from '../lib/payment-policy.mjs';
test('only configured secure site origins are allowed',()=>{assert.equal(siteOrigin('https://shop.example/path'),'https://shop.example');assert.equal(siteOrigin('http://localhost:3000'),'http://localhost:3000');assert.throws(()=>siteOrigin('http://shop.example'));assert.throws(()=>siteOrigin('https://user:secret@shop.example'));});
test('checkout redirect is restricted to Dodo hosts',()=>{assert(allowedCheckoutUrl('https://checkout.dodopayments.com/session/cks_test'));assert(allowedCheckoutUrl('https://test.checkout.dodopayments.com/session/cks_test'));for(const url of ['javascript:alert(1)','https://checkout.dodopayments.com.evil.com','http://checkout.dodopayments.com','https://attacker@checkout.dodopayments.com'])assert.equal(allowedCheckoutUrl(url),false);});
test('payment must belong to the checkout browser and configured product',()=>{const p={metadata:{launch_order:'random-secret'},product_cart:[{product_id:'pdt_studio',quantity:1}]};assert(ownsPayment(p,'random-secret','pdt_studio'));assert.equal(ownsPayment(p,'other','pdt_studio'),false);assert.equal(ownsPayment(p,undefined,'pdt_studio'),false);assert.equal(ownsPayment(p,'random-secret','pdt_wrong'),false);assert.equal(ownsPayment({},'random-secret','pdt_studio'),false);});
test('untrusted payment references are bounded',()=>{assert(validPaymentId('pay_123456'));assert.equal(validPaymentId(['pay_123456']),false);assert.equal(validPaymentId('../../secret'),false);assert.equal(validPaymentId('a'.repeat(101)),false);});

test('deployment origin handles malformed env without trusting request headers',()=>{
 assert.equal(configuredSiteOrigin({NEXT_PUBLIC_SITE_URL:'build-hamza.vercel.app'}),'https://build-hamza.vercel.app');
 assert.equal(configuredSiteOrigin({NEXT_PUBLIC_SITE_URL:'"https://build-hamza.vercel.app/"'}),'https://build-hamza.vercel.app');
 assert.equal(configuredSiteOrigin({VERCEL:'1',NEXT_PUBLIC_SITE_URL:'not a URL',VERCEL_PROJECT_PRODUCTION_URL:'build-hamza.vercel.app'}),'https://build-hamza.vercel.app');
 assert.equal(configuredSiteOrigin({VERCEL:'1',NEXT_PUBLIC_SITE_URL:'http://localhost:3000'}),'https://build-hamza.vercel.app');
 assert.equal(configuredSiteOrigin({}),'http://localhost:3000');
 assert.equal(configuredSiteOrigin({VERCEL:'1',NEXT_PUBLIC_SITE_URL:'javascript:alert(1)'}),'https://build-hamza.vercel.app');
});
