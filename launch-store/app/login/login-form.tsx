'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,CheckCircle2,Eye,EyeOff,KeyRound,LogIn,Sparkles,Store} from 'lucide-react';

type AuthMode = 'signup' | 'login' | 'recover';

export default function LoginForm({
 next,
 configured,
 initialMode = 'signup',
 loggedOutInitially = false
}:{
 next: string;
 configured: boolean;
 initialMode?: AuthMode;
 loggedOutInitially?: boolean;
}){
 const [showLoggedOut,setShowLoggedOut]=useState(loggedOutInitially);
 const [mode,setMode]=useState<AuthMode>(initialMode);
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [isError,setIsError]=useState(false);

 function switchMode(value:AuthMode){
  setShowLoggedOut(false);
  setMode(value);
  setMessage('');
  setIsError(false);
  setPassword('');
 }

 if(showLoggedOut){
  return (
   <div className="logged-out-card" role="region" aria-label="Signed out confirmation">
    <div className="logged-out-badge">
     <CheckCircle2 size={22}/>
     <span>SESSION ENDED SAFELY</span>
    </div>
    <h2>You’ve been signed out.</h2>
    <p>
     Your account session has been closed on this browser. Your purchased tools and saved Launchpad Studio progress stay securely linked to your email whenever you sign back in.
    </p>
    <div className="logged-out-actions">
     <button
      type="button"
      className="button dark"
      onClick={()=>{
       setShowLoggedOut(false);
       setMode('login');
      }}
     >
      <LogIn size={17}/> Sign back in
     </button>
     <Link href="/" className="button outline">
      <Store size={17}/> Back to store
     </Link>
    </div>
    <div className="logged-out-footer">
     <span>Using a different email?</span>
     <button
      type="button"
      className="auth-link"
      onClick={()=>{
       setShowLoggedOut(false);
       setMode('signup');
      }}
     >
      Create a new account →
     </button>
    </div>
   </div>
  );
 }

 return (
  <form
   className="account-form"
   onSubmit={async e=>{
    e.preventDefault();
    if(busy)return;
    setBusy(true);
    setMessage('');
    setIsError(false);
    try{
     const r=await fetch('/auth/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password,mode,next})
     });
     const d=await r.json();
     if(r.ok&&d.url){
      window.location.assign(d.url);
      return;
     }
     setIsError(!r.ok);
     setMessage(d.message||d.error||'Please try again.');
    }catch{
     setIsError(true);
     setMessage('Could not connect. Please try again.');
    }finally{
     setBusy(false);
    }
   }}
  >
   <div className="auth-tabs" aria-label="Account options">
    <button
     type="button"
     className={mode==='login'?'active':''}
     aria-pressed={mode==='login'}
     disabled={busy}
     onClick={()=>switchMode('login')}
    >
     <LogIn size={15}/> Sign in
    </button>
    <button
     type="button"
     className={mode==='signup'?'active':''}
     aria-pressed={mode==='signup'}
     disabled={busy}
     onClick={()=>switchMode('signup')}
    >
     <Sparkles size={15}/> Create account
    </button>
   </div>

   <div className="auth-mode-intro">
    {mode==='login' && (
     <>
      <h2>Welcome back.</h2>
      <p>Sign in with the email and password linked to your library.</p>
     </>
    )}
    {mode==='signup' && (
     <>
      <h2>Create your account.</h2>
      <p>Instant setup with your email and password—no verification email wait.</p>
     </>
    )}
    {mode==='recover' && (
     <>
      <h2>Set or reset your password.</h2>
      <p>Enter your account email and we’ll send a secure link to set a new password and keep your library.</p>
     </>
    )}
   </div>

   <div className="field-group">
    <label htmlFor="email">Email address</label>
    <input
     id="email"
     type="email"
     autoComplete="email"
     required
     maxLength={254}
     value={email}
     onChange={e=>setEmail(e.target.value)}
     placeholder="you@example.com"
     disabled={busy}
    />
   </div>

   {mode!=='recover' && (
    <div className="field-group">
     <div className="field-label-row">
      <label htmlFor="password">Password</label>
      <button
       type="button"
       className="password-toggle-btn"
       onClick={()=>setShowPassword(v=>!v)}
       aria-label={showPassword?'Hide password':'Show password'}
      >
       {showPassword ? <><EyeOff size={14}/> Hide</> : <><Eye size={14}/> Show</>}
      </button>
     </div>
     <input
      id="password"
      type={showPassword?'text':'password'}
      autoComplete={mode==='signup'?'new-password':'current-password'}
      minLength={mode==='signup'?8:1}
      maxLength={128}
      required
      value={password}
      onChange={e=>setPassword(e.target.value)}
      placeholder={mode==='signup'?'At least 8 characters':'Your password'}
      disabled={busy}
     />
    </div>
   )}

   <button className="button dark auth-submit-btn" disabled={!configured||busy}>
    <span>
     {busy
      ? 'Please wait…'
      : mode==='signup'
      ? 'Create account & continue'
      : mode==='login'
      ? 'Sign in to my library'
      : 'Send password reset link'}
    </span>
    <ArrowRight size={17}/>
   </button>

   <p role="status" className={`auth-status-note ${message?(isError?'is-error':'is-success'):''}`}>
    {message || (
     !configured
      ? 'Account setup is in progress. Please check back shortly.'
      : mode==='signup'
      ? 'No email verification required. Your account opens immediately.'
      : mode==='login'
      ? 'Use the same email address you used when purchasing.'
      : 'Check your inbox after requesting a password link.'
    )}
   </p>

   <div className="auth-bottom-links">
    {mode!=='recover' ? (
     <button
      type="button"
      className="auth-link"
      disabled={busy}
      onClick={()=>switchMode('recover')}
     >
      <KeyRound size={14}/> Set or reset password
     </button>
    ) : (
     <button
      type="button"
      className="auth-link"
      disabled={busy}
      onClick={()=>switchMode('login')}
     >
      <ArrowLeft size={14}/> Back to sign in
     </button>
    )}
    <Link href="/" className="auth-store-link">
     Return to storefront
    </Link>
   </div>
  </form>
 );
}
