// BUILD-40 RC192 shared first-party browser API contract.
// Bounded requests + JSON Content-Type validation. Callers decide domain-specific fallback UX.
export const FIRST_PARTY_API_TIMEOUT_MS=15000;
export async function fetchFirstPartySafe(url,options={},timeoutMs=FIRST_PARTY_API_TIMEOUT_MS){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetch(url,{...options,signal:controller.signal})}
 catch(e){if(e?.name==='AbortError')throw new Error('network_timeout');throw e}
 finally{clearTimeout(timer)}
}
export async function readFirstPartyJson(response){
 const ct=String(response?.headers?.get?.('content-type')||'').toLowerCase();
 if(!ct.includes('application/json'))throw new Error('invalid_json_response');
 try{return await response.json()}catch{throw new Error('invalid_json_response')}
}
export async function fetchFirstPartyJson(url,options={},timeoutMs=FIRST_PARTY_API_TIMEOUT_MS){
 const response=await fetchFirstPartySafe(url,options,timeoutMs);
 const data=await readFirstPartyJson(response);
 return {response,data};
}
