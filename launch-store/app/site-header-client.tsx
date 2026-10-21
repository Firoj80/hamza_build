'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowUpRight,BookOpen,LayoutDashboard,LogIn,LogOut,Menu,KeyRound,Sparkles,UserPlus,X} from 'lucide-react';
import BrandMark from './brand-mark';

type Props = {
 email?: string | null;
 isAdmin?: boolean;
 backHref?: string;
 backLabel?: string;
};

export default function SiteHeaderClient({email,isAdmin=false,backHref,backLabel}:Props){
 const [menuOpen,setMenuOpen]=useState(false);
 const isLoggedIn=Boolean(email);

 return (
  <header className="smart-header-shell">
   <div className="site-header wrap">
    <div className="header-brand-group">
     <BrandMark href="/" className="wordmark" icon/>
     {backHref && (
      <Link href={backHref} className="header-back-pill">
       <ArrowLeft size={14}/> {backLabel || 'All tools'}
      </Link>
     )}
    </div>

    <nav className="desktop-nav" aria-label="Main navigation">
     <Link href="/#tools">The tools</Link>
     <Link href="/#inside">How it works</Link>
     <Link href="/#questions">Questions</Link>
     <Link href="/support">Support</Link>
    </nav>

    <div className="header-auth-actions">
     {isLoggedIn ? (
      <>
       <span className="header-user-pill" title={email || ''}>
        <span className="header-user-dot" aria-hidden="true"/>
        <span className="header-user-email">{email}</span>
       </span>
       {isAdmin && (
        <Link href="/sales" className="header-btn header-btn-ghost">
         <LayoutDashboard size={15}/> Sales
        </Link>
       )}
       <Link href="/library" className="header-btn header-btn-primary">
        <BookOpen size={15}/> My library <ArrowUpRight size={15}/>
       </Link>
       <form action="/auth/logout" method="post" className="header-logout-form">
        <button type="submit" className="header-btn header-btn-outline">
         <LogOut size={15}/> Sign out
        </button>
       </form>
      </>
     ) : (
      <>
       <Link href="/login?mode=login" className="header-btn header-btn-outline">
        <LogIn size={15}/> Sign in
       </Link>
       <Link href="/login?mode=signup" className="header-btn header-btn-primary">
        <UserPlus size={15}/> Sign up <ArrowUpRight size={15}/>
       </Link>
      </>
     )}

     <button
      type="button"
      className="mobile-menu-toggle"
      aria-expanded={menuOpen}
      aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
      onClick={()=>setMenuOpen(v=>!v)}
     >
      {menuOpen ? <X size={20}/> : <Menu size={20}/>}
     </button>
    </div>
   </div>

   {menuOpen && (
    <div className="mobile-nav-drawer wrap" role="dialog" aria-label="Mobile navigation">
     <div className="mobile-nav-links">
      <Link href="/#tools" onClick={()=>setMenuOpen(false)}>The tools</Link>
      <Link href="/#inside" onClick={()=>setMenuOpen(false)}>How it works</Link>
      <Link href="/#questions" onClick={()=>setMenuOpen(false)}>Questions</Link>
      <Link href="/support" onClick={()=>setMenuOpen(false)}>Support</Link>
     </div>

     <div className="mobile-nav-auth">
      {isLoggedIn ? (
       <>
        <div className="mobile-user-summary">
         <span className="header-user-dot" aria-hidden="true"/>
         <div>
          <small>SIGNED IN AS</small>
          <strong>{email}</strong>
         </div>
        </div>
        <div className="mobile-auth-grid">
         <Link href="/library" className="button dark" onClick={()=>setMenuOpen(false)}>
          Open my library <ArrowUpRight size={16}/>
         </Link>
         <Link href="/account/password" className="button outline" onClick={()=>setMenuOpen(false)}>
          <KeyRound size={15}/> Password settings
         </Link>
         {isAdmin && (
          <Link href="/sales" className="button outline" onClick={()=>setMenuOpen(false)}>
           <LayoutDashboard size={15}/> Sales dashboard
          </Link>
         )}
         <form action="/auth/logout" method="post" className="mobile-logout-form">
          <button type="submit" className="button outline mobile-logout-btn">
           <LogOut size={15}/> Sign out
          </button>
         </form>
        </div>
       </>
      ) : (
       <div className="mobile-auth-grid">
        <Link href="/login?mode=signup" className="button dark" onClick={()=>setMenuOpen(false)}>
         <Sparkles size={16}/> Create account (Sign up)
        </Link>
        <Link href="/login?mode=login" className="button outline" onClick={()=>setMenuOpen(false)}>
         <LogIn size={16}/> Sign in to existing account
        </Link>
       </div>
      )}
     </div>
    </div>
   )}
  </header>
 );
}
