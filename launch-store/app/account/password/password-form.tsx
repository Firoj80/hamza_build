'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,Eye,EyeOff,KeyRound} from 'lucide-react';

export default function PasswordForm(){
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);

 return (
  <form
   className="account-form"
   onSubmit={async e=>{
    e.preventDefault();
    if(password!==confirm){
     setMessage('Passwords do not match.');
     return;
    }
    setBusy(true);
    setMessage('');
    try{
     const r=await fetch('/auth/password',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password})
     });
     const d=await r.json();
     if(r.ok){
      window.location.assign(d.url||'/library');
      return;
     }
     setMessage(d.error||'Could not save your password.');
    }catch{
     setMessage('Could not save your password. Try again.');
    }finally{
     setBusy(false);
    }
   }}
  >
   <div className="field-group">
    <div className="field-label-row">
     <label htmlFor="password">New password</label>
     <button
      type="button"
      className="password-toggle-btn"
      onClick={()=>setShowPassword(v=>!v)}
      aria-label={showPassword?'Hide passwords':'Show passwords'}
     >
      {showPassword ? <><EyeOff size={14}/> Hide</> : <><Eye size={14}/> Show</>}
     </button>
    </div>
    <input
     id="password"
     type={showPassword?'text':'password'}
     autoComplete="new-password"
     minLength={8}
     maxLength={128}
     required
     placeholder="At least 8 characters"
     value={password}
     onChange={e=>setPassword(e.target.value)}
     disabled={busy}
    />
   </div>

   <div className="field-group">
    <label htmlFor="confirm">Confirm new password</label>
    <input
     id="confirm"
     type={showPassword?'text':'password'}
     autoComplete="new-password"
     minLength={8}
     maxLength={128}
     required
     placeholder="Re-enter your new password"
     value={confirm}
     onChange={e=>setConfirm(e.target.value)}
     disabled={busy}
    />
   </div>

   <button className="button dark auth-submit-btn" disabled={busy}>
    <span>{busy?'Saving password…':'Save password & continue'}</span>
    <ArrowRight size={17}/>
   </button>

   <p role="status" className={`auth-status-note ${message?'is-error':''}`}>
    {message || 'Minimum 8 characters. Updating your password keeps your existing library and saved workspace intact.'}
   </p>

   <div className="auth-bottom-links">
    <Link href="/library" className="auth-store-link">
     ← Cancel and return to library
    </Link>
   </div>
  </form>
 );
}
