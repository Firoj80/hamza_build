import Link from 'next/link';
import {AlertTriangle,ArrowRight,ArrowUpRight,CheckCircle2,Clock3,HelpCircle,RefreshCw,ShieldCheck} from 'lucide-react';
import SiteHeader from '../site-header';
import SiteFooter from '../site-footer';
import {currentUser} from '@/lib/supabase/server';
import {reconcilePayment} from '@/lib/fulfillment';
import {validPaymentId} from '@/lib/payment-policy.mjs';
import {redirect} from 'next/navigation';

export const dynamic='force-dynamic';
export const metadata={title:'Your purchase — Hamza Idrishi',robots:{index:false,follow:false}};

export default async function Order({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,id=params.payment_id;
 const user=await currentUser();
 if(!user)redirect('/login?next='+encodeURIComponent('/order'+(validPaymentId(id)?'?payment_id='+id:'')));
 let status='unknown';
 try{
  if(validPaymentId(id))status=(await reconcilePayment(id as string,user.id)).status;
 }catch{}

 const isReady=status==='active';
 const isPending=status==='pending';
 const isRevoked=status==='revoked';

 return (
  <div className="page-shell">
   <SiteHeader backHref="/library" backLabel="My library"/>
   <main className="editorial-utility-main wrap">
    <div className="order-box order-status-card">
     <div className={`order-status-badge ${isReady?'is-active':isPending?'is-pending':'is-warning'}`}>
      {isReady ? <CheckCircle2 size={20}/> : isPending ? <Clock3 size={20}/> : <AlertTriangle size={20}/>}
      <span>
       {isReady
        ? 'PAYMENT VERIFIED · ACCESS UNLOCKED'
        : isPending
        ? 'VERIFICATION IN PROGRESS'
        : isRevoked
        ? 'ACCESS REVOKED'
        : 'CHECKING PAYMENT STATUS'}
      </span>
     </div>

     <h1>
      {isReady
       ? 'Your access is ready.'
       : isPending
       ? 'Your payment is processing.'
       : isRevoked
       ? 'This purchase is no longer active.'
       : 'We could not confirm this purchase yet.'}
     </h1>

     <p className="order-status-lead">
      {isReady
       ? 'Your purchase is now permanently linked to your account. Open your library to start reading the Fieldguide or working in Launchpad Studio—no file download is needed.'
       : 'Check your Dodo payment email and your library. If you just paid, allow a moment for verification, then check again. Do not pay a second time before contacting support.'}
     </p>

     <div className="order-steps-tracker">
      <div className="order-step is-done">
       <span>01</span>
       <div>
        <strong>Account connected</strong>
        <small>{user.email}</small>
       </div>
      </div>
      <div className={`order-step ${isReady?'is-done':isPending?'is-current':''}`}>
       <span>02</span>
       <div>
        <strong>Server payment verification</strong>
        <small>{validPaymentId(id)?`Ref: ${id}`:'Awaiting Dodo confirmation'}</small>
       </div>
      </div>
      <div className={`order-step ${isReady?'is-done':''}`}>
       <span>03</span>
       <div>
        <strong>Library unlocked</strong>
        <small>{isReady?'Ready in your browser':'Unlocks automatically'}</small>
       </div>
      </div>
     </div>

     <div className="order-status-actions">
      <Link className="button dark" href="/library">
       <span>Open my library</span>
       <ArrowUpRight size={17}/>
      </Link>
      {validPaymentId(id)&&!isReady&&(
       <Link className="button outline" href={'/order?payment_id='+encodeURIComponent(id as string)}>
        <RefreshCw size={16}/> Check payment again
       </Link>
      )}
      <Link className="button outline" href="/support">
       <HelpCircle size={16}/> Get purchase help
      </Link>
     </div>

     <div className="order-security-footnote">
      <ShieldCheck size={15}/>
      <span>Protected by server-side payment reconciliation. Redirect URLs alone never unlock or alter account access.</span>
     </div>
    </div>
   </main>
   <SiteFooter/>
  </div>
 );
}
