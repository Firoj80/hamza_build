'use client';
import {useState} from 'react';
import {ArrowUpRight,LoaderCircle} from 'lucide-react';
export default function CheckoutButton({className='button dark',children='Get Launchpad Studio',product='studio'}:{className?:string,children?:React.ReactNode,product?:'studio'|'fieldguide'}) {
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function checkout(){if(busy)return;setBusy(true);setError('');try{const r=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product})});const data=await r.json();if(r.status===401&&data.loginUrl){window.location.assign(data.loginUrl);return;}if(data.libraryUrl){window.location.assign('/library');return;}if(!r.ok)throw new Error(data.error);const u=new URL(data.url);if(u.protocol!=='https:'||!['checkout.dodopayments.com','test.checkout.dodopayments.com'].includes(u.hostname))throw new Error('Checkout unavailable.');window.location.assign(u.href);}catch(e){setError(e instanceof Error?e.message:'Please try again.');setBusy(false);}}
 return <div className="checkout-action"><button type="button" className={className} onClick={checkout} disabled={busy}>{busy?'Opening checkout…':children}{busy?<LoaderCircle className="spin" size={17}/>:<ArrowUpRight size={18}/>}</button>{error&&<p className="checkout-error" role="alert">{error} <a href="/support">Get help</a></p>}</div>;
}
