import {currentUser} from '@/lib/supabase/server';
import {isSalesAdmin} from '@/lib/platform-policy.mjs';
import SiteHeaderClient from './site-header-client';

type Props = {
 backHref?: string;
 backLabel?: string;
};

export default async function SiteHeader({backHref,backLabel}:Props={}){
 const user=await currentUser();
 return (
  <SiteHeaderClient
   email={user?.email||null}
   isAdmin={Boolean(user?.email&&isSalesAdmin(user.email))}
   backHref={backHref}
   backLabel={backLabel}
  />
 );
}
