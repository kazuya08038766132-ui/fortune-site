// BUILD-40 browser-side private palm upload.
// RC192: bounded network timeouts + fail-closed first-party JSON contract + one fresh-presign retry. Presigned URLs are never persisted.
const PALM_API_TIMEOUT_MS=15000;
const PALM_PUT_TIMEOUT_MS=30000;
async function fetchBounded(url,options={},timeoutMs=PALM_API_TIMEOUT_MS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal})}
  catch(e){if(e?.name==='AbortError')throw new Error('network_timeout');throw e}
  finally{clearTimeout(timer)}
}
// Never stores the presigned URL; it is used only for the immediate PUT.
async function readJsonFailClosed(r){
  const ct=String(r?.headers?.get?.('content-type')||'').toLowerCase();
  if(!ct.includes('application/json'))throw new Error('invalid_json_response');
  try{return await r.json()}catch{throw new Error('invalid_json_response')}
}
async function csrfToken(){
  const r=await fetchBounded("/api/csrf-token-v2",{credentials:"same-origin",cache:"no-store"});
  const data=await readJsonFailClosed(r);
  if(!r.ok||!data?.token)throw new Error("csrf_init_failed");
  return data.token;
}
async function apiPost(url,body,csrf){
  const r=await fetchBounded(url,{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},
    body:JSON.stringify(body)});
  const data=await readJsonFailClosed(r);
  if(!r.ok)throw Object.assign(new Error(data.error||"request_failed"),{status:r.status,data});
  return data;
}
export async function uploadPalmPrivate(file,{purpose="reading",saveHistory=false}={}){
  if(!(file instanceof File))throw new Error("file_required");
  const allowed=new Set(["image/jpeg","image/png","image/webp"]);
  if(!allowed.has(file.type))throw new Error("unsupported_content_type");
  if(file.size<1||file.size>12*1024*1024)throw new Error("invalid_file_size");
  const csrf=await csrfToken();
  let lastError;
  for(let attempt=0;attempt<2;attempt++){
    const p=await apiPost("/api/build40/palm/presign",{content_type:file.type,purpose,save_history:saveHistory===true},csrf);
    try{
      const put=await fetchBounded(p.upload_url,{method:"PUT",headers:{"Content-Type":file.type},body:file},PALM_PUT_TIMEOUT_MS);
      if(!put.ok)throw new Error(put.status===403?"upload_url_expired_or_invalid":"r2_upload_failed");
      const done=await apiPost(`/api/build40/palm/${encodeURIComponent(p.asset_id)}/finalize`,{},csrf);
      return {assetId:p.asset_id,state:done.state,size:done.size,deleteAfter:p.delete_after,retentionMode:p.retention_mode||"ephemeral"};
    }catch(e){lastError=e;if(attempt===0&&['upload_url_expired_or_invalid','r2_upload_failed','network_timeout'].includes(e?.message))continue;throw e}
  }
  throw lastError||new Error('r2_upload_failed');
}
export async function deletePalmPrivate(assetId){
  const csrf=await csrfToken();
  const r=await fetchBounded(`/api/build40/palm/${encodeURIComponent(assetId)}`,{
    method:"DELETE",credentials:"same-origin",headers:{"X-CSRF-Token":csrf}});
  const data=await readJsonFailClosed(r);
  if(!r.ok)throw new Error(data.error||"delete_failed");
  return data;
}

export async function savePalmReadingSnapshot(assetId,reading){
  const csrf=await csrfToken();
  return apiPost(`/api/build40/palm/${encodeURIComponent(assetId)}/snapshot`,{reading},csrf);
}
