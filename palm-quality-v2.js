(() => {
"use strict";
async function decode(file){
 if(!file) return null;
 if("createImageBitmap" in window) return await createImageBitmap(file);
 return await new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error("decode"))};im.src=u});
}
async function quality(file){
 if(!file)return {status:"RECAPTURE",reason:"NO_FILE"};
 if(file.size>18*1024*1024)return {status:"RECAPTURE",reason:"FILE_TOO_LARGE"};
 let im;try{im=await decode(file)}catch(_){return {status:"RECAPTURE",reason:"DECODE_FAILED"}}
 const w=im.width||im.naturalWidth,h=im.height||im.naturalHeight;
 if(Math.min(w,h)<360)return {status:"RECAPTURE",reason:"TOO_SMALL",width:w,height:h};
 const max=160,scale=Math.min(1,max/Math.max(w,h)),cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
 const c=document.createElement("canvas");c.width=cw;c.height=ch;const x=c.getContext("2d",{willReadFrequently:true});
 x.drawImage(im,0,0,cw,ch);if(im.close)im.close();
 const d=x.getImageData(0,0,cw,ch).data;let sum=0,sum2=0,n=0,dark=0,bright=0;
 // Downsampled O(25k) loop only: does not block like the legacy full-resolution analyzer.
 for(let i=0;i<d.length;i+=4){const y=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];sum+=y;sum2+=y*y;n++;if(y<22)dark++;if(y>245)bright++}
 const mean=sum/n,sd=Math.sqrt(Math.max(0,sum2/n-mean*mean)),darkRatio=dark/n,brightRatio=bright/n;
 if(mean<28||darkRatio>.82)return {status:"RECAPTURE",reason:"EXTREME_DARKNESS",width:w,height:h,mean:Math.round(mean),contrast:Math.round(sd)};
 if(mean>242||brightRatio>.88)return {status:"RECAPTURE",reason:"EXTREME_OVEREXPOSURE",width:w,height:h,mean:Math.round(mean),contrast:Math.round(sd)};
 if(sd<9)return {status:"RECAPTURE",reason:"VERY_LOW_CONTRAST",width:w,height:h,mean:Math.round(mean),contrast:Math.round(sd)};
 return {status:"ACCEPT",reason:"QUALITY_OK",width:w,height:h,mean:Math.round(mean),contrast:Math.round(sd),note:"背景・軽い影・傾き・肌色差だけでは拒否しません。主要線の判定とは別ゲートです。"};
}
window.PalmPublicQuality={version:"PALM_QUALITY_GATE_V2",quality};
})();

// BUILD-21 conservative image-quality extensions.
// These metrics judge photographic usability only; they never identify a palm line or body part.
function spec195EdgeVariance(ctx,w,h){
 const d=ctx.getImageData(0,0,w,h).data, g=new Float32Array(w*h);
 for(let i=0,j=0;i<d.length;i+=4,j++)g[j]=.299*d[i]+.587*d[i+1]+.114*d[i+2];
 let n=0,sum=0,sum2=0;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,v=4*g[i]-g[i-1]-g[i+1]-g[i-w]-g[i+w];sum+=v;sum2+=v*v;n++}
 return n?sum2/n-(sum/n)**2:0;
}
function spec195BorderActivity(ctx,w,h){
 const d=ctx.getImageData(0,0,w,h).data;let border=0,total=0,bn=0,tn=0;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=(y*w+x)*4,j=(y*w+x+1)*4,k=((y+1)*w+x)*4;
 const e=Math.abs(d[i]-d[j])+Math.abs(d[i+1]-d[j+1])+Math.abs(d[i+2]-d[j+2])+Math.abs(d[i]-d[k])+Math.abs(d[i+1]-d[k+1])+Math.abs(d[i+2]-d[k+2]);
 total+=e;tn++;if(x<4||y<4||x>w-5||y>h-5){border+=e;bn++}}
 return {border:bn?border/bn:0,overall:tn?total/tn:0};
}
window.PalmPhotoMetricsV3={version:"PALM_PHOTO_METRICS_V3",edgeVariance:spec195EdgeVariance,borderActivity:spec195BorderActivity,
 policy:Object.freeze({blur:"only severe blur should trigger recapture",crop:"border activity is only a hint; never reject solely from it",anatomy:"not inferred"})};
