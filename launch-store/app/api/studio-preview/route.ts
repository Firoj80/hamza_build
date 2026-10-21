import {NextRequest,NextResponse} from 'next/server';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {renderStudioPreview} from '@/lib/studio-preview.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const onVercel=process.env.VERCEL==='1';
 const source=await readFile(path.join(process.cwd(),'private/Launchpad_Platform.html'),'utf8');
 const style=source.slice(source.indexOf('<style>')+7,source.indexOf('</style>'));
 const csp=`default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; font-src data:; connect-src 'none'; ${onVercel?"frame-ancestors 'self'; ":''}base-uri 'none'; form-action 'none'`;
 return new NextResponse(renderStudioPreview(style,req.nextUrl.searchParams.get('step')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate',...(onVercel?{'X-Frame-Options':'SAMEORIGIN'}:{}),'Content-Security-Policy':csp}});
}
