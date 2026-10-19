import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export function authConfigured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);}
export async function authClient(){
 if(!authConfigured())throw new Error('Account service is not configured');
 const jar=await cookies();
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  cookies:{
   getAll(){return jar.getAll();},
   setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Proxy refreshes cookies for server-rendered pages. */}}
  }
 });
}
export async function currentUser(){if(!authConfigured())return null;const db=await authClient();const {data,error}=await db.auth.getUser();return error?null:data.user;}
