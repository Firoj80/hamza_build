import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase/server';
import {safeNext} from '@/lib/platform-policy.mjs';
import {siteOrigin} from '@/lib/payment-policy.mjs';
export async function GET(req:NextRequest){const origin=siteOrigin(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000');const code=req.nextUrl.searchParams.get('code');if(code){try{const {error}=await (await authClient()).auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(origin+safeNext(req.nextUrl.searchParams.get('next')));}catch{}}return NextResponse.redirect(origin+'/login?error=expired');}
