const KEY='fortuneDraft';
const TTL_MS=24*60*60*1000;
const SCHEMA='BUILD-40-RC90';

export function saveFortuneDraft(draft, now=Date.now()){
  if(!draft||typeof draft!=='object') return {ok:false,reason:'INVALID_DRAFT'};
  const envelope={schema:SCHEMA,savedAt:new Date(now).toISOString(),expiresAt:new Date(now+TTL_MS).toISOString(),draft};
  sessionStorage.setItem(KEY,JSON.stringify(envelope));
  return {ok:true,envelope};
}

export function loadFortuneDraft(now=Date.now()){
  const raw=sessionStorage.getItem(KEY);
  if(!raw) return {status:'EMPTY'};
  try{
    const x=JSON.parse(raw);
    if(x?.schema===SCHEMA&&x?.draft&&Date.parse(x.expiresAt)>now) return {status:'OK',draft:x.draft,envelope:x};
    // backward-compatible one-time import of RC83-RC89 plain draft shape
    if(x&&typeof x==='object'&&x.birthDate){
      const imported={...x,version:SCHEMA};
      saveFortuneDraft(imported,now);
      return {status:'OK',draft:imported,migrated:true};
    }
    sessionStorage.removeItem(KEY);
    return {status:'INVALID'};
  }catch{
    sessionStorage.removeItem(KEY);
    return {status:'INVALID'};
  }
}

export function clearFortuneDraft(){sessionStorage.removeItem(KEY)}
export const fortuneDraftStoreContract=Object.freeze({key:KEY,ttlHours:24,schema:SCHEMA,storage:'sessionStorage'});
