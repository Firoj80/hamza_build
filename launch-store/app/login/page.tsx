import Link from 'next/link';
import {ArrowLeft,BookOpen,Check,Layers,ShieldCheck} from 'lucide-react';
import LoginForm from './login-form';
import BrandMark from '../brand-mark';
import SiteFooter from '../site-footer';
import {postAuthRedirect,safeNext} from '@/lib/platform-policy.mjs';
import {authConfigured,currentUser} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';

export const dynamic='force-dynamic';
export const metadata={title:'Account & Sign in — Hamza Idrishi',robots:{index:false,follow:false}};

export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;
 const next=safeNext(params.next);
 const loggedOut=params.logged_out==='1';
 const rawMode=typeof params.mode==='string'?params.mode:'';
 const initialMode=rawMode==='login'?'login':rawMode==='recover'?'recover':loggedOut?'login':'signup';

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
      <div className="eyebrow"><span/> YOUR PERSONAL WORKSPACE</div>
      <h1>One account.<br/>Your <em>useful tools.</em></h1>
      <p className="auth-lead">
       Sign in or create an account in seconds. Your purchased Fieldguide and Launchpad Studio workspace stay linked to your email so you can pick up right where you left off.
      </p>

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
       />
      </div>
     </section>
    </div>
   </main>

   <SiteFooter/>
  </div>
 );
}
