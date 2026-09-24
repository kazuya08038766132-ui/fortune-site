const methods=(o,names)=>names.filter(n=>typeof o?.[n]!=="function");
export function integratedAdapterGate(x={}){
 const missing=[];
 if(!x.pool||typeof x.pool.query!=="function")missing.push("pool.query");
 if(!x.csrf)missing.push("csrf"); else missing.push(...methods(x.csrf,["session","sameOrigin","guard","issue"]).map(n=>"csrf."+n));
 if(!x.r2)missing.push("r2"); else missing.push(...methods(x.r2,["hasReadingConsent","ownsAsset","headObject","presign","finalize","delete"]).map(n=>"r2."+n));
 if(!x.resend)missing.push("resend"); else missing.push(...methods(x.resend,["handleRawWebhook"]).map(n=>"resend."+n));
 if(!x.recovery)missing.push("recovery"); else missing.push(...methods(x.recovery,["request","consume"]).map(n=>"recovery."+n));
 if(!x.verification)missing.push("verification"); else missing.push(...methods(x.verification,["request","consume"]).map(n=>"verification."+n));
 if(!x.readiness)missing.push("readiness"); else missing.push(...methods(x.readiness,["handle"]).map(n=>"readiness."+n));
 if(!x.stripeEvents)missing.push("stripeEvents"); else missing.push(...methods(x.stripeEvents,["handleRaw"]).map(n=>"stripeEvents."+n));
 if(!x.baseUrl||!/^https?:\/\//.test(x.baseUrl))missing.push("baseUrl");
 return {ready:missing.length===0,missing};
}
export function assertIntegratedAdapters(x){const r=integratedAdapterGate(x);if(!r.ready){const e=new Error("INTEGRATED_ADAPTERS_NOT_READY");e.missing=r.missing;throw e}return true}
