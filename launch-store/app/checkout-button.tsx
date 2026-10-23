'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,LoaderCircle} from 'lucide-react';
import posthog from 'posthog-js';
import {useCurrency} from './currency-context';

export default function CheckoutButton({
 className='button dark',
 children='Get Launchpad Studio',
 product='studio',
 usdPrice,
 autoStart=false
}:{
 className?:string;
 children?:React.ReactNode;
 product?:string;
 usdPrice?:number;
 autoStart?:boolean;
}) {
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const startedRef=useRef(false);
 const {currency,country,getQuote}=useCurrency();

 async function checkout(){
  if(busy)return;
  if(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN)posthog.capture('checkout_attempted',{product,currency,country});
  setBusy(true);
  setError('');
  try{
   const r=await fetch('/api/checkout',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({product,currency,country})
   });
   const data=await r.json();
   if(r.status===401&&data.loginUrl){window.location.assign(data.loginUrl);return;}
   if(data.libraryUrl){window.location.assign('/library');return;}
   if(!r.ok)throw new Error(data.error);
   const u=new URL(data.url);
   if(u.protocol!=='https:'||!['checkout.dodopayments.com','test.checkout.dodopayments.com'].includes(u.hostname))throw new Error('Checkout unavailable.');
   window.location.assign(u.href);
  }catch(e){
   setError(e instanceof Error?e.message:'Please try again.');
   setBusy(false);
  }
 }

 useEffect(()=>{
  if(autoStart&&!startedRef.current){
   startedRef.current=true;
   void checkout();
  }
 },[autoStart]);

 let renderedChildren=children;
 if(typeof children==='string'&&currency!=='USD'){
  if(typeof usdPrice==='number'){
   const q=getQuote(usdPrice,product);
   const replaced=children.replace(/\$\d+(?:\.\d{1,2})?/g,q.formattedPrice);
   renderedChildren=replaced!==children?replaced:`${children} (${q.formattedPrice})`;
  }else{
   renderedChildren=children.replace(/\$(\d+(?:\.\d{1,2})?)/g,(_,numStr)=>{
    const num= parseFloat(numStr);
    if(!Number.isFinite(num))return `$${numStr}`;
    return getQuote(num,product).formattedPrice;
   });
  }
 }

 return (
  <div className="checkout-action">
   <button type="button" className={className} onClick={checkout} disabled={busy}>
    {busy?'Opening checkout…':renderedChildren}
    {busy?<LoaderCircle className="spin" size={17}/>:<ArrowUpRight size={18}/>}
   </button>
   {error&&<p className="checkout-error" role="alert">{error} <a href="/support">Get help</a></p>}
  </div>
 );
}
