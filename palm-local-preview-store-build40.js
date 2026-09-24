const DB='fortune-palm-local-preview-build40';
const STORE='preview';
const KEY='latest';
const MAX_AGE_MS=24*60*60*1000;

function openDb(indexedDBObject=globalThis.indexedDB){
  if(!indexedDBObject) return Promise.resolve(null);
  return new Promise((resolve,reject)=>{
    const req=indexedDBObject.open(DB,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error||new Error('PALM_PREVIEW_DB'));
  });
}
export async function savePalmPreview(blob,{indexedDBObject=globalThis.indexedDB,now=Date.now()}={}){
  if(!(blob instanceof Blob))throw Error('PALM_PREVIEW_BLOB');
  const db=await openDb(indexedDBObject); if(!db)return {stored:false,reason:'NO_INDEXEDDB'};
  await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put({blob,createdAt:now},KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('PALM_PREVIEW_WRITE'));});
  db.close(); return {stored:true};
}
export async function loadPalmPreview({indexedDBObject=globalThis.indexedDB,now=Date.now(),maxAgeMs=MAX_AGE_MS}={}){
  const db=await openDb(indexedDBObject); if(!db)return null;
  const value=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(KEY);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||new Error('PALM_PREVIEW_READ'));});
  db.close();
  if(!value?.blob)return null;
  if(!Number.isFinite(value.createdAt)||now-value.createdAt>maxAgeMs){await clearPalmPreview({indexedDBObject});return null;}
  return value.blob;
}
export async function clearPalmPreview({indexedDBObject=globalThis.indexedDB}={}){
  const db=await openDb(indexedDBObject); if(!db)return {cleared:false,reason:'NO_INDEXEDDB'};
  await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('PALM_PREVIEW_DELETE'));});
  db.close(); return {cleared:true};
}
export async function makePalmPreviewBlob(file,{createBitmap=globalThis.createImageBitmap,documentObject=globalThis.document,maxSide=1100,quality=.82}={}){
  if(!file||typeof createBitmap!=='function'||!documentObject?.createElement)throw Error('PALM_PREVIEW_API');
  const bitmap=await createBitmap(file);
  try{
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=documentObject.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('PALM_PREVIEW_CANVAS');ctx.drawImage(bitmap,0,0,w,h);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PALM_PREVIEW_ENCODE')),'image/jpeg',quality));
  }finally{bitmap?.close?.();}
}
export const PALM_PREVIEW_MAX_AGE_MS=MAX_AGE_MS;
