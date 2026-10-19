import Link from 'next/link';
import LoginForm from './login-form';
import {safeNext} from '@/lib/platform-policy.mjs';
import {authConfigured,currentUser} from '@/lib/supabase/server';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Sign in — Build Hamza',robots:{index:false,follow:false}};
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const next=safeNext((await searchParams).next);if(await currentUser())redirect(next);return <main className="simple-page"><Link href="/">← Build Hamza</Link><div className="order-box"><div className="eyebrow">YOUR PERSONAL WORKSPACE</div><h1>One account.<br/>Your useful tools.</h1><p>Sign in or create your account with an email link. Your purchased products will appear in your library.</p><LoginForm next={next} configured={authConfigured()}/></div><p><Link href="/privacy">Privacy</Link> · <Link href="/support">Need help?</Link></p></main>;}
