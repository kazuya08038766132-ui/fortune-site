
const IDX=Object.freeze({WRIST:0,THUMB_CMC:1,THUMB_MCP:2,INDEX_MCP:5,MIDDLE_MCP:9,RING_MCP:13,PINKY_MCP:17});
const fin=n=>Number.isFinite(Number(n));
const p=(x)=>({x:Number(x.x),y:Number(x.y)});
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const mul=(a,s)=>({x:a.x*s,y:a.y*s});
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const len=a=>Math.hypot(a.x,a.y);
const norm=a=>{const L=len(a);if(L<1e-9)throw Error("DEGENERATE_GEOMETRY");return mul(a,1/L)};
const avg=(xs)=>mul(xs.reduce(add,{x:0,y:0}),1/xs.length);

export function validateHandLandmarks(landmarks){
 if(!Array.isArray(landmarks)||landmarks.length!==21)return {ok:false,reason:"LANDMARK_COUNT"};
 for(const q of landmarks)if(!q||!fin(q.x)||!fin(q.y))return {ok:false,reason:"LANDMARK_VALUE"};
 return {ok:true};
}
export function buildPalmGeometry(landmarks,{handedness="UNCERTAIN",handednessConfidence=0}={}){
 const v=validateHandLandmarks(landmarks);if(!v.ok)throw Error(v.reason);
 const L=landmarks.map(p);
 const wrist=L[IDX.WRIST], index=L[IDX.INDEX_MCP], middle=L[IDX.MIDDLE_MCP], ring=L[IDX.RING_MCP], pinky=L[IDX.PINKY_MCP];
 const top=avg([index,middle,ring,pinky]);
 const palmCenter=avg([wrist,index,middle,ring,pinky]);
 // u points index/radial-side -> pinky/ulnar-side. v points wrist -> fingers.
 const axisU=norm(sub(pinky,index));
 let axisV=norm(sub(top,wrist));
 // Gram-Schmidt prevents perspective skew from corrupting the local frame.
 axisV=norm(sub(axisV,mul(axisU,dot(axisV,axisU))));
 const palmWidth=Math.max(len(sub(pinky,index)),1e-6);
 const palmHeight=Math.max(len(sub(top,wrist)),1e-6);
 const xs=L.map(q=>q.x),ys=L.map(q=>q.y);
 const bbox={x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys)};
 const toPalm=(q)=>{
   q=p(q);const d=sub(q,palmCenter);
   return {u:dot(d,axisU)/palmWidth,v:dot(d,axisV)/palmHeight};
 };
 const fromPalm=(q)=>{
   const d=add(mul(axisU,Number(q.u)*palmWidth),mul(axisV,Number(q.v)*palmHeight));
   return add(palmCenter,d);
 };
 return Object.freeze({
   palmCenter,axisU,axisV,palmWidth,palmHeight,bbox,
   handedness:["LEFT","RIGHT"].includes(String(handedness).toUpperCase())?String(handedness).toUpperCase():"UNCERTAIN",
   handednessConfidence:Math.max(0,Math.min(1,Number(handednessConfidence)||0)),
   landmarks:L,toPalm,fromPalm,
   anchors:Object.freeze({wrist,indexMcp:index,middleMcp:middle,ringMcp:ring,pinkyMcp:pinky})
 });
}
