(() => {
"use strict";
async function decode(file){
 if(!file)return null;
 if("createImageBitmap" in window)return await createImageBitmap(file);
 return await new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error("decode"))};im.src=u});
}
async function quality(file){
 if(!file)return {status:"RECAPTURE",reason:"NO_FILE"};
 if(file.size>24*1024*1024)return {status:"RECAPTURE",reason:"FILE_TOO_LARGE"};
 let im;try{im=await decode(file)}catch(_){return {status:"RECAPTURE",reason:"DECODE_FAILED"}}
 const w=im.width||im.naturalWidth,h=im.height||im.naturalHeight;
 if(Math.min(w,h)<320){if(im.close)im.close();return {status:"RECAPTURE",reason:"TOO_SMALL",width:w,height:h}}
 const max=160,scale=Math.min(1,max/Math.max(w,h)),cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
 const c=document.createElement("canvas");c.width=cw;c.height=ch;const x=c.getContext("2d",{willReadFrequently:true});
 x.drawImage(im,0,0,cw,ch);if(im.close)im.close();
 let d;try{d=x.getImageData(0,0,cw,ch).data}catch(_){return {status:"ACCEPT",reason:"PIXEL_CHECK_SKIPPED",width:w,height:h,note:"画像は読めたため受付。解析段階で個別判定します。"}}
 let sum=0,sum2=0,n=0,dark=0,bright=0;
 for(let i=0;i<d.length;i+=4){const y=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];sum+=y;sum2+=y*y;n++;if(y<18)dark++;if(y>250)bright++}
 const mean=sum/n,sd=Math.sqrt(Math.max(0,sum2/n-mean*mean)),darkRatio=dark/n,brightRatio=bright/n;
 if(mean<20&&darkRatio>.9)return {status:"RECAPTURE",reason:"EXTREME_DARKNESS",width:w,height:h,mean:Math.round(mean),contrast:Math.round(sd)};
 if(mean>248&&brightRatio>.94)return {status:"RECAPTURE",reason:"EXTREME_OVEREXPOSURE",width:w,height:h,mean:Math.round(mean),contrast:Math.round(sd)};
 // Do not reject for low global contrast: a palm can be pale on a pale background.
 return {status:"ACCEPT",reason:"QUALITY_OK",width:w,height:h,mean:Math.round(mean),contrast:Math.round(sd),note:"軽い影・傾き・背景・肌色・低めの全体コントラストだけでは拒否しません。"};
}
window.PalmPublicQuality={version:"PALM_QUALITY_GATE_V3_BUILD37",quality};
})();