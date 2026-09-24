const KEY_RE=/^[A-Za-z0-9_-]{20,80}$/;
export function readCheckoutRequestKey(req){
 const key=String(req?.get?.('x-idempotency-key')||req?.headers?.['x-idempotency-key']||'').trim();
 return KEY_RE.test(key)?key:null;
}
export function stripeCheckoutIdempotencyKey(product,key){
 if(!['detail','membership'].includes(product)||!KEY_RE.test(String(key||'')))throw new Error('invalid_checkout_idempotency_key');
 return `fortune:${product}:${key}`;
}
export function sameCheckoutOwner(row,{sessionKey,product}){
 return !!row&&String(row.session_key)===String(sessionKey)&&String(row.product_type)===String(product);
}
export function reusableCheckout(row){
 return !!row&&row.state==='ready'&&!!row.stripe_checkout_url&&!!row.resource_id;
}
export function terminalCheckout(row){
 return !!row&&['processing','paid','active','canceled','failed','expired'].includes(String(row.state||''));
}
export function terminalCheckoutPayload(row){
 if(!terminalCheckout(row))return null;
 return {error:'checkout_attempt_terminal',state:String(row.state),resourceId:String(row.resource_id||'')};
}
