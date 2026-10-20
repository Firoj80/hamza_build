import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase/server';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
import {postAuthRedirect} from '@/lib/platform-policy.mjs';
export async function POST(req:NextRequest){try{
 const origin=configuredSiteOrigin();if(req.headers.get('origin')!==origin)return NextResponse.json({error:'Invalid request'},{status:403});
 const input=await req.json();
 if(typeof input.email!=='string'||input.email.length>254||!/^\S+@\S+\.\S+$/.test(input.email.trim()))return NextResponse.json({error:'Enter a valid email address.'},{status:400});
 const email=input.email.trim();const db=await authClient();const headers={'Cache-Control':'no-store'};
 if(input.mode==='recover'){
  const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:origin+'/auth/callback?next='+encodeURIComponent('/account/password')});
  if(error)return NextResponse.json({error:'Could not send a reset link. Please wait and try again.'},{status:429,headers});
  return NextResponse.json({message:'If this account exists, a password link is on its way. Open the newest link in this browser.'},{headers});
 }
 if(input.mode!=='signup'&&input.mode!=='login')return NextResponse.json({error:'Choose sign in or create account.'},{status:400,headers});
 if(typeof input.password!=='string'||input.password.length>128||input.password.length<(input.mode==='signup'?8:1))return NextResponse.json({error:input.mode==='signup'?'Use a password with 8 to 128 characters.':'Enter your password.'},{status:400,headers});
 const credentials={email,password:input.password};
 const {data,error}=input.mode==='signup'?await db.auth.signUp(credentials):await db.auth.signInWithPassword(credentials);
 if(error){const limited=error.status===429;return NextResponse.json({error:limited?'Too many attempts. Please wait before trying again.':input.mode==='signup'?'Could not create this account. It may already exist; try signing in or setting a password.':'Email or password is incorrect. Try again or reset your password.'},{status:limited?429:400,headers});}
 if(!data.session)return NextResponse.json({error:'Account created, but immediate sign-in is unavailable. Contact support to check account settings.'},{status:409,headers});
 return NextResponse.json({url:postAuthRedirect(data.user?.email,input.next)},{headers});
 }catch{return NextResponse.json({error:'Sign-in is temporarily unavailable. Please try again.'},{status:503});}}
