import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase/server';
import {postAuthRedirect,safeNext} from '@/lib/platform-policy.mjs';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
export async function GET(req:NextRequest){const origin=configuredSiteOrigin();const code=req.nextUrl.searchParams.get('code');if(code){try{const {data,error}=await (await authClient()).auth.exchangeCodeForSession(code);if(!error){const next=req.nextUrl.searchParams.get('next');const destination=safeNext(next)==='/account/password'?'/account/password':postAuthRedirect(data.user?.email,next);return NextResponse.redirect(origin+destination);}}catch{}}return NextResponse.redirect(origin+'/login?error=expired&next='+encodeURIComponent(safeNext(req.nextUrl.searchParams.get('next'))));}
