'use client';
import {useState,useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {Download,Search,PlusCircle,ShieldOff,Loader2} from 'lucide-react';
import styles from './sales.module.css';

export type CustomerRecord={
 userId:string;
 email:string;
 ownsStudio:boolean;
 ownsFieldguide:boolean;
 triedStudio:number;
 triedFieldguide:number;
 workspaceKeys:number;
 workspaceSummary:string|null;
 nicheLabel:string|null;
 checksCompleted:number;
 workspaceUpdatedAtFormatted:string|null;
 spentFormatted:string;
 hasPaid:boolean;
 lastActivityFormatted:string;
 lastActivityIso:string;
};

export type PaymentExportRow={
 type:'payment'|'checkout_attempt';
 id:string;
 customer:string;
 product:string;
 status:string;
 amount:string;
 dateIso:string;
};

function downloadCsv(filename:string,headers:string[],rows:(string|number|boolean)[][]){
 const escapeCell=(val:string|number|boolean)=>{
  const str=String(val??'');
  return str.includes(',')||str.includes('"')||str.includes('\n')?`"${str.replace(/"/g,'""')}"`:str;
 };
 const csv=[headers.map(escapeCell).join(','),...rows.map(r=>r.map(escapeCell).join(','))].join('\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;
 a.download=filename;
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(url);
}

export default function CustomerAdmin({
 customers,
 paymentExportRows
}:{
 customers:CustomerRecord[];
 paymentExportRows:PaymentExportRow[];
}){
 const router=useRouter();
 const [query,setQuery]=useState('');
 const [segment,setSegment]=useState<'all'|'paid'|'upgrade'|'abandoned'|'workspace'>('all');
 const [grantEmail,setGrantEmail]=useState('');
 const [grantProduct,setGrantProduct]=useState<'studio'|'fieldguide'>('studio');
 const [busyKey,setBusyKey]=useState<string|null>(null);
 const [statusMsg,setStatusMsg]=useState<{type:'ok'|'err';text:string}|null>(null);

 const filtered=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return customers.filter(c=>{
   if(q&&!c.email.toLowerCase().includes(q)&&!c.userId.toLowerCase().includes(q)&&!(c.nicheLabel||'').toLowerCase().includes(q))return false;
   if(segment==='paid')return c.hasPaid;
   if(segment==='upgrade')return c.ownsFieldguide&&!c.ownsStudio;
   if(segment==='abandoned')return !c.hasPaid&&(c.triedStudio+c.triedFieldguide>0);
   if(segment==='workspace')return c.ownsStudio&&c.workspaceKeys>0;
   return true;
  });
 },[customers,query,segment]);

 async function handleAccess(params:{userId?:string;email?:string;productKey:'studio'|'fieldguide';action:'grant'|'revoke';key:string}){
  setBusyKey(params.key);
  setStatusMsg(null);
  try{
   const res=await fetch('/api/admin/access',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     userId:params.userId,
     email:params.email,
     productKey:params.productKey,
     action:params.action
    })
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok){
    setStatusMsg({type:'err',text:data.error||'Could not update product access'});
   }else{
    const prodName=params.productKey==='studio'?'Launchpad Studio':'Fieldguide';
    setStatusMsg({
     type:'ok',
     text:params.action==='grant'?`Granted ${prodName} access.`:`Revoked ${prodName} access.`
    });
    if(params.email)setGrantEmail('');
    router.refresh();
   }
  }catch{
   setStatusMsg({type:'err',text:'Network error while updating access'});
  }finally{
   setBusyKey(null);
  }
 }

 function exportCustomers(){
  downloadCsv(
   `customers-${new Date().toISOString().slice(0,10)}.csv`,
   ['Email','User ID','Owns Fieldguide ($5)','Owns Studio ($9)','Studio Checkouts','Fieldguide Checkouts','Studio Niche','Checklist Completed (of 7)','Workspace Summary','Total Paid','Last Active'],
   filtered.map(c=>[
    c.email,
    c.userId,
    c.ownsFieldguide,
    c.ownsStudio,
    c.triedStudio,
    c.triedFieldguide,
    c.nicheLabel||'',
    c.checksCompleted,
    c.workspaceSummary||'',
    c.spentFormatted,
    c.lastActivityIso
   ])
  );
 }

 function exportLedger(){
  downloadCsv(
   `sales-and-checkouts-${new Date().toISOString().slice(0,10)}.csv`,
   ['Record Type','ID','Customer','Product','Status','Amount','Timestamp'],
   paymentExportRows.map(r=>[r.type,r.id,r.customer,r.product,r.status,r.amount,r.dateIso])
  );
 }

 return <div className={styles.adminWrap}>
  <div className={styles.adminToolbar}>
   <div className={styles.searchBox}>
    <Search size={14}/>
    <input
     type="search"
     value={query}
     onChange={e=>setQuery(e.target.value)}
     placeholder="Search customer email, user ID, or niche..."
     aria-label="Search customer email, user ID, or niche"
    />
   </div>
   <div className={styles.segmentTabs}>
    <button type="button" className={segment==='all'?styles.segActive:''} onClick={()=>setSegment('all')}>All ({customers.length})</button>
    <button type="button" className={segment==='paid'?styles.segActive:''} onClick={()=>setSegment('paid')}>Paid buyers ({customers.filter(c=>c.hasPaid).length})</button>
    <button type="button" className={segment==='upgrade'?styles.segActive:''} onClick={()=>setSegment('upgrade')}>Upgrade leads ({customers.filter(c=>c.ownsFieldguide&&!c.ownsStudio).length})</button>
    <button type="button" className={segment==='abandoned'?styles.segActive:''} onClick={()=>setSegment('abandoned')}>Abandoned ({customers.filter(c=>!c.hasPaid&&c.triedStudio+c.triedFieldguide>0).length})</button>
    <button type="button" className={segment==='workspace'?styles.segActive:''} onClick={()=>setSegment('workspace')}>Active Studio ({customers.filter(c=>c.ownsStudio&&c.workspaceKeys>0).length})</button>
   </div>
   <div className={styles.exportActions}>
    <button type="button" className={styles.copyButton} onClick={exportCustomers}><Download size={14}/> Customers CSV</button>
    <button type="button" className={styles.copyButton} onClick={exportLedger}><Download size={14}/> Sales & Funnel CSV</button>
   </div>
  </div>

  <form
   className={styles.grantBar}
   onSubmit={e=>{
    e.preventDefault();
    if(!grantEmail.trim())return;
    handleAccess({email:grantEmail,productKey:grantProduct,action:'grant',key:'email_grant'});
   }}
  >
   <span className={styles.grantLabel}>Manual access grant:</span>
   <input
    type="email"
    required
    value={grantEmail}
    onChange={e=>setGrantEmail(e.target.value)}
    placeholder="Registered customer email..."
    className={styles.grantInput}
   />
   <select
    value={grantProduct}
    onChange={e=>setGrantProduct(e.target.value as 'studio'|'fieldguide')}
    className={styles.grantSelect}
    aria-label="Select product to grant"
   >
    <option value="studio">Launchpad Studio ($9)</option>
    <option value="fieldguide">Idea-to-Income Fieldguide ($5)</option>
   </select>
   <button type="submit" disabled={busyKey==='email_grant'} className={styles.grantBtn}>
    {busyKey==='email_grant'?<Loader2 size={14} className="spin"/>:<PlusCircle size={14}/>}
    Grant complimentary access
   </button>
   {statusMsg&&<span className={statusMsg.type==='ok'?styles.msgOk:styles.msgErr}>{statusMsg.text}</span>}
  </form>

  {filtered.length===0?<p className={styles.empty}>No customers match the current filter.</p>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Customer</th><th>Owned products</th><th>Studio workspace progress</th><th>Lifecycle / upgrade signal</th><th>Total paid</th><th>Quick access control</th></tr></thead><tbody>{filtered.slice(0,50).map(c=>{
   const ownershipLabel=c.ownsStudio&&c.ownsFieldguide
    ?'Fieldguide + Studio ($14)'
    :c.ownsStudio
     ?'Launchpad Studio ($9)'
     :c.ownsFieldguide
      ?'Fieldguide ($5)'
      :'None yet';
   const ownershipBadge=c.ownsStudio&&c.ownsFieldguide
    ?styles.bundle
    :c.ownsStudio||c.ownsFieldguide
     ?styles.active
     :styles.neutral;
   const wsText=c.workspaceKeys>0
    ?(c.workspaceSummary||`Active · ${c.workspaceKeys} saved keys`)
    :c.ownsStudio
     ?'Unlocked · not saved yet'
     :'—';
   const signal=c.ownsStudio&&c.ownsFieldguide
    ?{text:'Full-stack customer',cls:styles.bundle}
    :c.ownsFieldguide&&!c.ownsStudio
     ?{text:c.triedStudio>0?'Warm lead · tried Studio checkout':'Upgrade candidate → Studio ($9)',cls:styles.upgrade}
     :c.ownsStudio&&!c.ownsFieldguide
      ?{text:c.checksCompleted>=7?'Completed 7/7 launch actions':c.workspaceKeys>0?'Active Studio builder':'New Studio buyer',cls:styles.active}
      :c.triedStudio+c.triedFieldguide>0
       ?{text:`Abandoned checkout (${c.triedStudio+c.triedFieldguide}x)`,cls:styles.abandoned}
       :{text:'Signed up · browsing',cls:styles.neutral};
   return <tr key={c.userId}>
    <td><strong>{c.email}</strong><span className={styles.cellSub}>Last active {c.lastActivityFormatted}</span></td>
    <td><span className={`${styles.badge} ${ownershipBadge}`}>{ownershipLabel}</span></td>
    <td>{wsText}{c.workspaceUpdatedAtFormatted&&<span className={styles.cellSub}>{c.nicheLabel?`${c.nicheLabel} · `:''}Synced {c.workspaceUpdatedAtFormatted}</span>}</td>
    <td><span className={`${styles.badge} ${signal.cls}`}>{signal.text}</span></td>
    <td><strong>{c.spentFormatted}</strong></td>
    <td>
     <div className={styles.rowActions}>
      {!c.ownsStudio?(
       <button
        type="button"
        disabled={busyKey===`${c.userId}:studio`}
        onClick={()=>handleAccess({userId:c.userId,productKey:'studio',action:'grant',key:`${c.userId}:studio`})}
        className={styles.actionGrant}
       >
        <PlusCircle size={12}/> Grant Studio
       </button>
      ):(
       <button
        type="button"
        disabled={busyKey===`${c.userId}:studio`}
        onClick={()=>handleAccess({userId:c.userId,productKey:'studio',action:'revoke',key:`${c.userId}:studio`})}
        className={styles.actionRevoke}
       >
        <ShieldOff size={12}/> Revoke Studio
       </button>
      )}
      {!c.ownsFieldguide?(
       <button
        type="button"
        disabled={busyKey===`${c.userId}:fieldguide`}
        onClick={()=>handleAccess({userId:c.userId,productKey:'fieldguide',action:'grant',key:`${c.userId}:fieldguide`})}
        className={styles.actionGrant}
       >
        <PlusCircle size={12}/> Grant Guide
       </button>
      ):(
       <button
        type="button"
        disabled={busyKey===`${c.userId}:fieldguide`}
        onClick={()=>handleAccess({userId:c.userId,productKey:'fieldguide',action:'revoke',key:`${c.userId}:fieldguide`})}
        className={styles.actionRevoke}
       >
        <ShieldOff size={12}/> Revoke Guide
       </button>
      )}
     </div>
    </td>
   </tr>;
  })}</tbody></table></div>}
 </div>;
}
