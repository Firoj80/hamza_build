import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/supabase/server';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const runtime='nodejs';
export async function GET(){const user=await currentUser();if(!user)return new NextResponse(null,{status:401});const bytes=await readFile(path.join(process.cwd(),'private/first-product-fieldguide.pdf'));return new NextResponse(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="First_Product_Fieldguide.pdf"','Cache-Control':'private, no-store','X-Frame-Options':'SAMEORIGIN'}});}
