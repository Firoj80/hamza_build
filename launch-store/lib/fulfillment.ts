import 'server-only';
import {adminClient} from './supabase/admin';
import {paymentConfig} from './dodo';
import {paymentAccessStatus} from './platform-policy.mjs';
export async function reconcilePayment(paymentId:string,expectedUser?:string){
 const {client}=paymentConfig();
 const payment=await client.payments.retrieve(paymentId);
 const attemptId=payment.metadata?.platform_attempt;
 if(typeof attemptId!=='string'){if(expectedUser)throw new Error('No platform checkout association');return {status:'ignored',product:null};}
 const db=adminClient();
 const {data:attempt,error}=await db.from('platform_checkout_attempts').select('*').eq('id',attemptId).single();
 if(error||!attempt||expectedUser&&attempt.user_id!==expectedUser)throw new Error('Payment does not belong to this account');
 if(!payment.product_cart?.some(p=>p.product_id===attempt.provider_product_id&&p.quantity===1))throw new Error('Payment product mismatch');
 const status=paymentAccessStatus(payment);
 const {error:writeError}=await db.rpc('platform_record_payment',{p_attempt_id:attempt.id,p_payment_id:payment.payment_id,p_access_status:status,p_provider_status:payment.status||'unknown'});
 if(writeError)throw new Error('Could not persist purchase');
 return {status,product:attempt.product_key};
}
