import {NextResponse} from 'next/server';
import {currentUser,authClient} from '@/lib/supabase/server';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const runtime='nodejs';
export async function GET(){const user=await currentUser();if(!user)return new NextResponse(null,{status:401});const db=await authClient();const {data:access,error}=await db.from('platform_purchases').select('payment_id').eq('user_id',user.id).eq('product_key','fieldguide').eq('access_status','active').limit(1);if(error||!access?.length)return new NextResponse('Fieldguide purchase required.',{status:403});const bytes=await readFile(path.join(process.cwd(),'private/first-product-fieldguide.pdf'));return new NextResponse(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="First_Product_Fieldguide.pdf"','Cache-Control':'private, no-store','X-Frame-Options':'SAMEORIGIN'}});}
