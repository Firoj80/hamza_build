import Link from 'next/link';
import LoginForm from './login-form';
import BrandMark from '../brand-mark';
import {postAuthRedirect,safeNext} from '@/lib/platform-policy.mjs';
import {authConfigured,currentUser} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Sign in — Hamza Idrishi',robots:{index:false,follow:false}};
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const next=safeNext(params.next);const user=await currentUser();if(user)redirect(postAuthRedirect(user.email,next));return <main className="simple-page"><BrandMark back/><div className="order-box"><div className="eyebrow">YOUR PERSONAL WORKSPACE</div><h1>One account.<br/>Your useful tools.</h1><p>Create an account with your email and password. No verification email needed. Your purchased products will appear in your library.</p>{params.error==='expired'&&<p role="alert">This password link has expired or was opened in a different browser. Use Set or reset password to request a new link.</p>}<LoginForm next={next} configured={authConfigured()}/></div><p><Link href="/privacy">Privacy</Link> · <Link href="/support">Need help?</Link></p></main>;}
