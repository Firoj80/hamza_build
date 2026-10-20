import 'server-only';
import {authClient,currentUser} from './supabase/server';
import {redirect} from 'next/navigation';
export type ProductKey='studio'|'fieldguide';
export async function ownedProducts(){const user=await currentUser();if(!user)return {user:null,products:[] as string[]};const db=await authClient();const {data,error}=await db.from('platform_purchases').select('product_key').eq('user_id',user.id).eq('access_status','active');if(error)throw new Error('Could not load product access');return {user,products:[...new Set(['fieldguide',...(data||[]).map(p=>p.product_key as string)])]};}
export async function requireProduct(product:ProductKey){const user=await currentUser();if(!user)redirect('/login?next='+encodeURIComponent(product==='studio'?'/studio':'/fieldguide'));if(product==='fieldguide')return user;const db=await authClient();const {data,error}=await db.from('platform_purchases').select('payment_id').eq('user_id',user.id).eq('product_key',product).eq('access_status','active').limit(1);if(error)throw new Error('Access temporarily unavailable');if(!data?.length)redirect('/library?locked='+product);return user;}
