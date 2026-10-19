import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase/server';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
export async function POST(req:NextRequest){const origin=configuredSiteOrigin();if(req.headers.get('origin')!==origin)return new NextResponse('Forbidden',{status:403});await (await authClient()).auth.signOut();return NextResponse.redirect(origin+'/login',{status:303});}
