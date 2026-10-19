import Link from 'next/link';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/supabase/server';
import PasswordForm from './password-form';
export const dynamic='force-dynamic';
export const metadata={title:'Set password — Build Hamza',robots:{index:false,follow:false}};
export default async function Page(){if(!await currentUser())redirect('/login');return <main className="simple-page"><Link href="/library">← Your library</Link><div className="order-box"><h1>Set your password.</h1><p>Use this password to sign in with your email next time.</p><PasswordForm/></div></main>;}
