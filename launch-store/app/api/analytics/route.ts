import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {adminClient} from '@/lib/supabase/admin';

export const runtime='nodejs';
const allowed=new Set(['/','/products/first-product-fieldguide','/products/launchpad-studio','/fieldguide','/studio']);
function json(body:unknown,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}

export async function POST(request:NextRequest){
 try{
  const body=await request.json();
  const path=typeof body?.path==='string'?body.path:'';
  if(!allowed.has(path))return json({error:'Invalid path'},400);
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!secret)return json({error:'Analytics unavailable'},503);
  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||'unknown';
  const visitorHash=createHmac('sha256',secret).update(`${forwarded}|${request.headers.get('user-agent')||''}`).digest('hex');
  const db=adminClient();
  const {error}=await db.rpc('record_site_pageview',{p_path:path,p_visitor_hash:visitorHash});
  if(error)return json({error:'Analytics unavailable'},503);
  return json({ok:true},201);
 }catch{return json({error:'Analytics unavailable'},503)}
}

