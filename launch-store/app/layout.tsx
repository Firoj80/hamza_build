import type {Metadata} from 'next';
import './globals.css';
import {configuredSiteOrigin} from '@/lib/payment-policy.mjs';
import AnalyticsTracker from './analytics-tracker';
export const metadata:Metadata={
  metadataBase:new URL(configuredSiteOrigin()),
  title:'Hamza Idrishi | Threads + AIs + Digital Products= Money Machine 💵',
  description:'Practical tools for your first digital product. Start with the $5 Idea-to-Income Fieldguide PDF, the $9 Launchpad Studio HTML App, or the $12 Complete Creator Launch Bundle.',
  icons:{
    icon:[
      {url:'/assets/aistudio/ik_Vm6tn_d1cf175a.jpg',type:'image/jpeg'},
    ],
    shortcut:['/assets/aistudio/ik_Vm6tn_d1cf175a.jpg'],
    apple:[
      {url:'/assets/aistudio/ik_Vm6tn_d1cf175a.jpg',type:'image/jpeg'},
    ],
  },
  openGraph:{
    type:'website',
    siteName:'Hamza Idrishi · Build_hamza',
    title:'Hamza Idrishi | Threads + AIs + Digital Products= Money Machine 💵',
    description:'A seven-page fieldguide PDF and an offline-ready 5-stage HTML launch workspace. Built for creators.',
    url:'/',
    images:[
      {
        url:'/images/launchpad-studio-og.png',
        width:1600,
        height:1100,
        alt:'Launchpad Studio 5-stage command center cover with offer brief, AI prompt builder, scenario model and 30 post starters',
        type:'image/png',
      },
      {
        url:'/images/idea-to-income-fieldguide-og.png',
        width:1600,
        height:1100,
        alt:'Idea-to-Income Fieldguide hardcover monograph concept and customer validation scorecard sheet',
        type:'image/png',
      },
    ],
  },
  twitter:{
    card:'summary_large_image',
    site:'@hamza_build',
    creator:'@hamza_build',
    title:'Hamza Idrishi | Threads + AIs + Digital Products= Money Machine 💵',
    description:'A seven-page fieldguide PDF and an offline-ready 5-stage HTML launch workspace. Built for creators.',
    images:['/images/launchpad-studio-og.png'],
  },
  other:{
    'p:domain_verify':'8f5e5f223fcb46249353a2b8576fbd75',
  },
};
import {CurrencyProvider} from './currency-context';
export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://checkout.dodopayments.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://checkout.dodopayments.com" />
        <link rel="preconnect" href="https://test.checkout.dodopayments.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://test.checkout.dodopayments.com" />
      </head>
      <body>
        <CurrencyProvider>
          <AnalyticsTracker/>
          {children}
        </CurrencyProvider>
      </body>
    </html>
  );
}

