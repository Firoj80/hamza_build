export function safeNext(value){return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!/[\r\n]/.test(value)?value:'/library';}
export function isSalesAdmin(email,configured='alamtech9@gmail.com'){if(typeof email!=='string')return false;const admins=String(configured||'alamtech9@gmail.com').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);return admins.includes(email.trim().toLowerCase());}
export function postAuthRedirect(email,next,configured='alamtech9@gmail.com'){return isSalesAdmin(email,configured)?'/sales':safeNext(next);}
export function paymentAccessStatus(payment){if(payment.refund_status||payment.refunds?.some(r=>r.status==='succeeded')||payment.disputes?.length)return 'revoked';return payment.status==='succeeded'?'active':'pending';}
export function cleanWorkspace(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid workspace');
 const out={};
 const strings=['niche','audience','problem','freeTitle','paidTitle','evidence','job','freeUrl','paidUrl','deliverables','results'];
 for(const key of strings)if(typeof input[key]==='string')out[key]=input[key].slice(0,key==='niche'||key==='job'?100:20000);
 for(const key of ['offer','price','views','clickRate','downloadRate','buyRate','feeRate','fixedFee','day'])if(typeof input[key]==='number'&&Number.isFinite(input[key]))out[key]=Math.max(0,input[key]);
 if(typeof input.human==='boolean')out.human=input.human;
 out.posts={};for(let i=0;i<30;i++)if(typeof input.posts?.[i]==='string')out.posts[i]=input.posts[i].slice(0,20000);
 out.checks={};for(let i=0;i<7;i++)out.checks[i]=input.checks?.[i]===true;
 out.offer=Math.min(2,out.offer||0);out.day=Math.min(29,out.day||0);
 if(!['ai_hustle','focus_habits','prompt_mastery','threads_growth','job_resume','simple_budget','meal_prep','budget_travel'].includes(out.niche))out.niche='ai_hustle';
 if(!['outline','page','edit','paid','email'].includes(out.job))out.job='outline';
 return out;
}
