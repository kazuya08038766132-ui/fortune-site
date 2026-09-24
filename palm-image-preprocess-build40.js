
const clamp=(x,a=0,b=255)=>Math.max(a,Math.min(b,x));
export function letterboxPlan(srcW,srcH,targetW,targetH){
 if(!(srcW>0&&srcH>0&&targetW>0&&targetH>0))throw Error("INVALID_DIMENSIONS");
 const scale=Math.min(targetW/srcW,targetH/srcH),drawW=Math.round(srcW*scale),drawH=Math.round(srcH*scale);
 return {scale,drawW,drawH,dx:Math.floor((targetW-drawW)/2),dy:Math.floor((targetH-drawH)/2),targetW,targetH,srcW,srcH};
}
export function rgbaToRgbFloatCHW(rgba,w,h,{mean=[.5,.5,.5],std=[.5,.5,.5]}={}){
 if(!rgba||rgba.length!==w*h*4)throw Error("RGBA_SIZE");const out=new Float32Array(3*w*h),plane=w*h;
 for(let i=0;i<plane;i++){const b=i*4;for(let c=0;c<3;c++)out[c*plane+i]=((clamp(rgba[b+c])/255)-mean[c])/std[c]}return out;
}
export function imageDataToTensorSpec(imageData,{inputWidth=512,inputHeight=512,mean=[.5,.5,.5],std=[.5,.5,.5]}={}){
 if(imageData.width!==inputWidth||imageData.height!==inputHeight)throw Error("PREPROCESS_SIZE_MISMATCH");
 return {data:rgbaToRgbFloatCHW(imageData.data,inputWidth,inputHeight,{mean,std}),dims:[1,3,inputHeight,inputWidth],type:"float32"};
}
export function normalizedPointToSource([x,y],plan){return [(x*plan.targetW-plan.dx)/plan.drawW,(y*plan.targetH-plan.dy)/plan.drawH]}
export function sourcePointToNormalized([x,y],plan){return [(x*plan.drawW+plan.dx)/plan.targetW,(y*plan.drawH+plan.dy)/plan.targetH]}
