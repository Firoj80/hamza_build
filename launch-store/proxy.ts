import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return response;
 const db=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll(){return request.cookies.getAll();},setAll(values,headers){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));Object.entries(headers||{}).forEach(([k,v])=>response.headers.set(k,v));}}});
 await db.auth.getClaims();
 response.headers.set('Cache-Control','private, no-store, max-age=0');
 return response;
}
export const config={matcher:['/library/:path*','/studio/:path*','/fieldguide/:path*','/login','/auth/:path*','/api/workspace/:path*','/api/workspace-state','/api/fieldguide','/api/checkout','/order']};
