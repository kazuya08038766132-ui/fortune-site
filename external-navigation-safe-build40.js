// BUILD-40 RC214 external navigation boundary.
// Only provider-owned HTTPS hosts may be used for browser redirects returned by first-party APIs.
const STRIPE_REDIRECT_HOSTS=new Set(['checkout.stripe.com','billing.stripe.com']);
export function safeStripeRedirectUrl(value){
 try{
  const u=new URL(String(value||''));
  if(u.protocol!=='https:'||!STRIPE_REDIRECT_HOSTS.has(u.hostname)||u.username||u.password)return '';
  return u.href;
 }catch{return ''}
}
export function navigateToStripe(value,locationObject=globalThis.location){
 const safe=safeStripeRedirectUrl(value);
 if(!safe)throw new Error('invalid_external_redirect');
 locationObject.href=safe;
 return safe;
}
