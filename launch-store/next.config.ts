import type { NextConfig } from 'next';
const onVercel = process.env.VERCEL === '1';
const config: NextConfig = {
  ...(onVercel ? {} : { output: 'standalone' }),
  poweredByHeader: false,
  outputFileTracingIncludes: {'/api/studio-preview':['./private/Launchpad_Platform.html'],'/api/workspace':['./private/Launchpad_Platform.html'],'/api/fieldguide':['./private/first-product-fieldguide.pdf']},
  async headers() {
    return [{source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'no-referrer'},
      ...(onVercel ? [{key:'X-Frame-Options',value:'DENY'}] : []),
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
    ]},{source:'/api/studio-preview',headers:[{key:'X-Frame-Options',value:'SAMEORIGIN'}]},{source:'/api/workspace',headers:[{key:'X-Frame-Options',value:'SAMEORIGIN'}]},{source:'/api/fieldguide',headers:[{key:'X-Frame-Options',value:'SAMEORIGIN'}]}];
  }
};
export default config;
