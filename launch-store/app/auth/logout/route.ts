import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase/server';
import {configuredSiteOrigin,trustedRequestOrigin} from '@/lib/payment-policy.mjs';
export async function POST(req:NextRequest){const origin=trustedRequestOrigin(req);if(!origin)return new NextResponse('Forbidden',{status:403});try{await (await authClient()).auth.signOut();}catch{}return NextResponse.redirect(origin+'/login',{status:303});}
export async function GET(req:NextRequest){const origin=trustedRequestOrigin(req)||configuredSiteOrigin();return NextResponse.redirect(origin+'/login',{status:303});}
