import 'server-only';
import DodoPayments from 'dodopayments';
export function paymentConfig() {
  const key=process.env.DODO_PAYMENTS_API_KEY;
  const environment=process.env.DODO_PAYMENTS_ENVIRONMENT || 'test_mode';
  if(!key) throw new Error('Checkout configuration missing');
  if(environment !== 'test_mode' && environment !== 'live_mode') throw new Error('Invalid payment environment');
  return {client:new DodoPayments({bearerToken:key,environment,maxRetries:1,timeout:15000}),environment};
}
