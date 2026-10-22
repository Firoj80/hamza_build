import Link from 'next/link';
import {ArrowLeft,BookOpen,Check,Layers,ShieldCheck} from 'lucide-react';
import LoginForm from './login-form';
import BrandMark from '../brand-mark';
import SiteFooter from '../site-footer';
import {postAuthRedirect,safeNext} from '@/lib/platform-policy.mjs';
import {authConfigured,currentUser} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';

import type {Metadata} from 'next';
import {productDetails} from '@/lib/catalog';

export const dynamic='force-dynamic';

function resolveTargetProduct(next:string){
 if(next==='/fieldguide'||next==='/library?buy=fieldguide')return productDetails['first-product-fieldguide'];
 if(next==='/studio'||next==='/library?buy=studio')return productDetails['launchpad-studio'];
 return null;
}

export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}):Promise<Metadata>{
 const params=await searchParams;
 const next=safeNext(params.next);
 const product=resolveTargetProduct(next);
 if(product){
  return {
   title:`${product.name} — Hamza Idrishi`,
   description:product.description,
   robots:{index:false,follow:false},
   openGraph:{
    type:'website',
    siteName:'Hamza Idrishi · Build_hamza',
    title:product.shareTitle,
    description:product.shareDescription,
    url:`/products/${product.product==='fieldguide'?'first-product-fieldguide':'launchpad-studio'}`,
    images:[{url:product.ogImage,width:1600,height:1100,alt:product.imageAlt,type:'image/png'}],
   },
   twitter:{
    card:'summary_large_image',
    site:'@hamza_build',
    creator:'@hamza_build',
    title:product.shareTitle,
    description:product.shareDescription,
    images:[{url:product.ogImage,alt:product.imageAlt}],
   },
  };
 }
 return {title:'Account & Sign in — Hamza Idrishi',robots:{index:false,follow:false}};
}

export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;
 const next=safeNext(params.next);
 const loggedOut=params.logged_out==='1';
 const rawMode=typeof params.mode==='string'?params.mode:'';
 const initialMode=rawMode==='login'?'login':rawMode==='recover'?'recover':loggedOut?'login':'signup';
 const targetProduct=resolveTargetProduct(next);

 const user=await currentUser();
 if(user)redirect(postAuthRedirect(user.email,next));

 return (
  <div className="page-shell">
   <header className="smart-header-shell">
    <div className="site-header wrap">
     <div className="header-brand-group">
      <BrandMark href="/" className="wordmark" icon/>
     </div>
     <div className="header-auth-actions">
      <Link href="/" className="header-btn header-btn-outline">
       <ArrowLeft size={15}/> Back to store
      </Link>
      <Link href="/support" className="header-btn header-btn-ghost">
       Need help?
      </Link>
     </div>
    </div>
   </header>

   <main className="auth-portal-main wrap">
    <div className="auth-portal-grid">
     <section className="auth-editorial-panel">
      <div className="eyebrow"><span/> {targetProduct ? `STEP 1 OF 2 · ACCOUNT SETUP FOR $${targetProduct.price} CHECKOUT` : 'YOUR PERSONAL WORKSPACE'}</div>
      {targetProduct ? (
       <>
        <h1>Unlock <em>{targetProduct.name}.</em></h1>
        <p className="auth-lead">
         Create your account or sign in first so your <strong>${targetProduct.price} USD one-time purchase</strong> is permanently linked to your email. You’ll go straight to secure Dodo checkout in the next step.
        </p>
       </>
      ) : (
       <>
        <h1>One account.<br/>Your <em>useful tools.</em></h1>
        <p className="auth-lead">
         Sign in or create an account in seconds. Your purchased Fieldguide and Launchpad Studio workspace stay linked to your email so you can pick up right where you left off.
        </p>
       </>
      )}

      <div className="auth-feature-list">
       <div className="auth-feature-item">
        <span className="auth-feature-icon"><Check size={16}/></span>
        <div>
         <strong>Instant account access</strong>
         <p>Create an account with your email and password—no waiting on verification links.</p>
        </div>
       </div>
       <div className="auth-feature-item">
        <span className="auth-feature-icon"><BookOpen size={16}/></span>
        <div>
         <strong>Idea-to-Income Fieldguide · $5</strong>
         <p>Seven-page practical guide with customer research questions, worked examples, and prompts.</p>
        </div>
       </div>
       <div className="auth-feature-item">
        <span className="auth-feature-icon"><Layers size={16}/></span>
        <div>
         <strong>Launchpad Studio · $9</strong>
         <p>Interactive launch workspace with 30 post starters, listing drafts, and cloud-saved progress.</p>
        </div>
       </div>
      </div>

      <div className="auth-trust-bar">
       <ShieldCheck size={16}/>
       <span>Protected by server-verified ownership · Pay once, no recurring subscription</span>
      </div>
     </section>

     <section className="auth-card-panel">
      <div className="order-box auth-order-box">
       {params.error==='expired' && (
        <div className="auth-expired-banner" role="alert">
         This password link has expired or was opened in a different browser. Use <strong>Set or reset password</strong> below to request a fresh link.
        </div>
       )}
       <LoginForm
        next={next}
        configured={authConfigured()}
        initialMode={initialMode}
        loggedOutInitially={loggedOut}
        checkoutProduct={targetProduct?{name:targetProduct.name,price:targetProduct.price}:null}
       />
      </div>
     </section>
    </div>
   </main>

   <SiteFooter/>
  </div>
 );
}

