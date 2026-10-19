import Link from 'next/link';
import {currentUser} from '@/lib/supabase/server';
import {reconcilePayment} from '@/lib/fulfillment';
import {validPaymentId} from '@/lib/payment-policy.mjs';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Your purchase — Build Hamza',robots:{index:false,follow:false}};
export default async function Order({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams,id=params.payment_id;const user=await currentUser();if(!user)redirect('/login?next='+encodeURIComponent('/order'+(validPaymentId(id)?'?payment_id='+id:'')));let status='unknown';try{if(validPaymentId(id))status=(await reconcilePayment(id as string,user.id)).status;}catch{}
return <main className="simple-page"><Link href="/">← Build Hamza</Link><div className="order-box"><h1>{status==='active'?'Your access is ready.':status==='pending'?'Your payment is processing.':status==='revoked'?'This purchase is no longer active.':'We could not confirm this purchase yet.'}</h1><p>{status==='active'?'Your purchase is now linked to your account. Open your library to start using it on this platform. No product download is needed.':'Check your Dodo payment email and your library. If you just paid, allow a moment for verification, then check again. Do not pay a second time before contacting support.'}</p><Link className="button dark" href="/library">Open my library ↗</Link>{validPaymentId(id)&&status!=='active'&&<p><Link href={'/order?payment_id='+encodeURIComponent(id as string)}>Check payment again</Link></p>}<p><Link href="/support">Get purchase help</Link></p></div></main>;}
