"use client";
import {useState} from 'react';
export default function LoginForm({next,configured}:{next:string,configured:boolean}){
 const [mode,setMode]=useState<'signup'|'login'|'recover'>('signup');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 function switchMode(value:typeof mode){setMode(value);setMessage('');setPassword('');}
 return <form className="account-form" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{
  const r=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,mode,next})});const d=await r.json();
  if(r.ok&&d.url){window.location.assign(d.url);return;}setMessage(d.message||d.error||'Please try again.');
 }catch{setMessage('Could not connect. Please try again.');}finally{setBusy(false);}}}>
 <div className="auth-tabs" aria-label="Account options"><button type="button" className={mode==='signup'?'active':''} aria-pressed={mode==='signup'} disabled={busy} onClick={()=>switchMode('signup')}>Create account</button><button type="button" className={mode==='login'?'active':''} aria-pressed={mode==='login'} disabled={busy} onClick={()=>switchMode('login')}>Sign in</button></div>
 {mode==='recover'&&<p>Already used an email link, or forgot your password? Set a password for the same email to keep your library.</p>}
 <label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" disabled={busy}/>
 {mode!=='recover'&&<><label htmlFor="password">Password</label><input id="password" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={mode==='signup'?8:1} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='signup'?'At least 8 characters':'Your password'} disabled={busy}/></>}
 <button className="button dark" disabled={!configured||busy}>{busy?'Please wait…':mode==='signup'?'Create account & continue':mode==='login'?'Sign in':'Send password link'}</button>
 <p role="status">{message||(!configured?'Account setup is in progress. Please check back shortly.':mode==='signup'?'No email verification. Create your account and open your library.':'Use the same account you used for your purchases.')}</p>
 {mode!=='recover'&&<button type="button" className="auth-link" disabled={busy} onClick={()=>switchMode('recover')}>Set or reset password</button>}
 </form>;
}
