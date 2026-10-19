import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {paymentConfig} from '@/lib/dodo';
import {currentUser,authClient} from '@/lib/supabase/server';
import {adminClient} from '@/lib/supabase/admin';
import {siteOrigin,allowedCheckoutUrl} from '@/lib/payment-policy.mjs';
export const runtime='nodejs';
export async function POST(request:NextRequest){try{
 const origin=siteOrigin(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000');
 if(request.headers.get('origin')!==origin)return NextResponse.json({error:'Please start checkout from this website.'},{status:403});
 const body=await request.json().catch(()=>({}));const key=body.product;
 if(key!=='studio'&&key!=='fieldguide')return NextResponse.json({error:'Unknown product'},{status:400});
 const user=await currentUser();if(!user)return NextResponse.json({loginUrl:'/login?next='+encodeURIComponent('/library?buy='+key)},{status:401});
 const db=await authClient();const {data:owned,error:accessError}=await db.from('platform_purchases').select('payment_id').eq('user_id',user.id).eq('product_key',key).eq('access_status','active').limit(1);
 if(accessError)throw new Error('Access lookup failed');if(owned?.length)return NextResponse.json({libraryUrl:'/library'});
 const productId=key==='studio'?process.env.DODO_STUDIO_PRODUCT_ID:process.env.DODO_FIELDGUIDE_PRODUCT_ID;
 if(!productId)throw new Error('Missing product');
 const {client}=paymentConfig();const product=await client.products.retrieve(productId);const cents=key==='studio'?1900:500;
 if(product.price.type!=='one_time_price'||product.price.currency!=='USD'||product.price.price!==cents||product.price.pay_what_you_want)throw new Error('Offer mismatch');
 const admin=adminClient();const since=new Date(Date.now()-60*1000).toISOString();const {count,error:limitError}=await admin.from('platform_checkout_attempts').select('id',{count:'exact',head:true}).eq('user_id',user.id).gte('created_at',since);
 if(limitError)throw new Error('Checkout service unavailable');if((count||0)>=5)return NextResponse.json({error:'Please wait a minute before opening another checkout.'},{status:429});
 const attempt=randomUUID();const {error}=await admin.from('platform_checkout_attempts').insert({id:attempt,user_id:user.id,product_key:key,provider_product_id:productId,expected_cents:cents});if(error)throw new Error('Could not create order');
 const session=await client.checkoutSessions.create({product_cart:[{product_id:productId,quantity:1}],customer:{email:user.email!},return_url:origin+'/order',metadata:{platform_attempt:attempt}});
 if(!session.checkout_url||!allowedCheckoutUrl(session.checkout_url))throw new Error('Invalid provider URL');
 return NextResponse.json({url:session.checkout_url},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Checkout is temporarily unavailable. Please try again later or contact support.'},{status:503});}}
