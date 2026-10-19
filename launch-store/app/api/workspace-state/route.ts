import {NextRequest,NextResponse} from 'next/server';
import {authClient,currentUser} from '@/lib/supabase/server';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
import {cleanWorkspace} from '@/lib/platform-policy.mjs';
export async function PUT(req:NextRequest){if(req.headers.get('origin')!==configuredSiteOrigin())return new NextResponse(null,{status:403});const user=await currentUser();if(!user)return new NextResponse(null,{status:401});try{const raw=await req.text();if(raw.length>1000000)return new NextResponse(null,{status:413});const state=cleanWorkspace(JSON.parse(raw));const db=await authClient();const {error}=await db.from('platform_workspace').upsert({user_id:user.id,state,updated_at:new Date().toISOString()});if(error)return new NextResponse(null,{status:403});return NextResponse.json({saved:true},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Invalid workspace state'},{status:400});}}
