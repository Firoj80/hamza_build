import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),title:'Build Hamza — Start small. Make something useful.',description:'Practical tools for your first digital product. Validate your idea with the $5 First Product Fieldguide, then organise the launch with Launchpad Studio.',openGraph:{title:'Your first product starts with one useful idea.',description:'$5 fieldguide and a private online launch workspace. Built for first-time creators.',images:['/images/screenshots/studio-validate.jpg']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
