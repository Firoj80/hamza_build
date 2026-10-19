import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase/server';
import {safeNext} from '@/lib/platform-policy.mjs';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
export async function GET(req:NextRequest){const origin=configuredSiteOrigin();const code=req.nextUrl.searchParams.get('code');if(code){try{const {error}=await (await authClient()).auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(origin+safeNext(req.nextUrl.searchParams.get('next')));}catch{}}return NextResponse.redirect(origin+'/login?error=expired');}
