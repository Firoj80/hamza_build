import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase/server';
import {siteOrigin} from '@/lib/payment-policy.mjs';
export async function POST(req:NextRequest){const origin=siteOrigin(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000');if(req.headers.get('origin')!==origin)return new NextResponse('Forbidden',{status:403});await (await authClient()).auth.signOut();return NextResponse.redirect(origin+'/login',{status:303});}
