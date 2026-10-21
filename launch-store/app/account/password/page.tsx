import Link from 'next/link';
import {redirect} from 'next/navigation';
import {Check,KeyRound,ShieldCheck} from 'lucide-react';
import {currentUser} from '@/lib/supabase/server';
import PasswordForm from './password-form';
import SiteHeader from '../../site-header';
import SiteFooter from '../../site-footer';

export const dynamic='force-dynamic';
export const metadata={title:'Set password — Hamza Idrishi',robots:{index:false,follow:false}};

export default async function Page(){
 const user=await currentUser();
 if(!user)redirect('/login');

 return (
  <div className="page-shell">
   <SiteHeader backHref="/library" backLabel="Your library"/>
   <main className="auth-portal-main wrap">
    <div className="auth-portal-grid">
     <section className="auth-editorial-panel">
      <div className="eyebrow"><span/> ACCOUNT SECURITY</div>
      <h1>Set your<br/><em>account password.</em></h1>
      <p className="auth-lead">
       Signed in as <strong>{user.email}</strong>. Set or update your password so you can sign in directly from any browser or device.
      </p>

      <div className="auth-feature-list">
       <div className="auth-feature-item">
        <span className="auth-feature-icon"><KeyRound size={16}/></span>
        <div>
         <strong>Direct email & password sign-in</strong>
         <p>Use this password whenever you sign in to open your Fieldguide or Launchpad Studio.</p>
        </div>
       </div>
       <div className="auth-feature-item">
        <span className="auth-feature-icon"><Check size={16}/></span>
        <div>
         <strong>Your library stays untouched</strong>
         <p>Changing your password never affects your unlocked products or saved Launchpad Studio drafts.</p>
        </div>
       </div>
      </div>

      <div className="auth-trust-bar">
       <ShieldCheck size={16}/>
       <span>Passwords are encrypted via Supabase Auth and never stored in workspace records.</span>
      </div>
     </section>

     <section className="auth-card-panel">
      <div className="order-box auth-order-box">
       <div className="auth-mode-intro">
        <h2>Choose a new password.</h2>
        <p>Use this password to sign in with {user.email} next time.</p>
       </div>
       <PasswordForm/>
      </div>
     </section>
    </div>
   </main>
   <SiteFooter/>
  </div>
 );
}
