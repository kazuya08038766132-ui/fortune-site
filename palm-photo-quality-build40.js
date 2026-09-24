const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function evaluatePalmPhotoPixels({width,height,data},{minShortSide=480,minMean=45,maxMean=225,minContrast=28}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!data)throw Error('PALM_QUALITY_INPUT');
 const short=Math.min(width,height),baseStep=Math.max(1,Math.floor((width*height)/50000)),step=baseStep>1?baseStep+1:1;
 let n=0,sum=0,sum2=0,dark=0,bright=0,edgeN=0,edgeSum=0,edgeSum2=0,prevY=null;
 for(let i=0;i<width*height;i+=step){const o=i*4,r=data[o]??0,g=data[o+1]??0,b=data[o+2]??0;const y=.2126*r+.7152*g+.0722*b;n++;sum+=y;sum2+=y*y;if(y<25)dark++;if(y>245)bright++;if(prevY!==null){const d=y-prevY;edgeN++;edgeSum+=d;edgeSum2+=d*d;}prevY=y;}
 const mean=sum/n,variance=Math.max(0,sum2/n-mean*mean),contrast=Math.sqrt(variance),darkRatio=dark/n,brightRatio=bright/n,edgeVariance=edgeN?Math.max(0,edgeSum2/edgeN-(edgeSum/edgeN)**2):0;
 const issues=[];
 if(short<minShortSide)issues.push('LOW_RESOLUTION');
 if(mean<minMean)issues.push('TOO_DARK');
 if(mean>maxMean)issues.push('TOO_BRIGHT');
 if(contrast<minContrast)issues.push('LOW_CONTRAST');
 if(darkRatio>.42)issues.push('SHADOW_HEAVY');
 if(brightRatio>.28)issues.push('HIGHLIGHT_CLIPPED');
 if(edgeVariance<18)issues.push('BLUR_DETECTED');
 return {acceptable:issues.length===0,width,height,shortSide:short,meanLuma:+mean.toFixed(2),contrast:+contrast.toFixed(2),darkRatio:+darkRatio.toFixed(4),brightRatio:+brightRatio.toFixed(4),blurScore:+edgeVariance.toFixed(2),issues};
}
export async function evaluatePalmPhotoFile(file,{createBitmap=globalThis.createImageBitmap,documentObject=globalThis.document,maxBytes=12*1024*1024}={}){
 if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type||''))throw Error('PALM_IMAGE_TYPE');
 if(!(file.size>0&&file.size<=maxBytes))throw Error('PALM_IMAGE_SIZE');
 if(typeof createBitmap!=='function'||!documentObject?.createElement)throw Error('PALM_IMAGE_API_UNAVAILABLE');
 const bitmap=await createBitmap(file);
 try{const max=640,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));const c=documentObject.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('PALM_CANVAS_CONTEXT');ctx.drawImage(bitmap,0,0,w,h);const im=ctx.getImageData(0,0,w,h);return evaluatePalmPhotoPixels(im);}finally{bitmap?.close?.();}
}
export function palmPhotoQualityMessage(q){
 if(q.acceptable)return '撮影品質は良好です。手のひら全体が写っていれば解析へ進めます。';
 const map={LOW_RESOLUTION:'画像解像度が低いため、もう少し近くで撮影してください。',TOO_DARK:'暗すぎます。明るい場所で撮り直してください。',TOO_BRIGHT:'明るすぎます。強い照明や白飛びを避けてください。',LOW_CONTRAST:'手のしわが見えにくい状態です。均一な明るさで撮影してください。',SHADOW_HEAVY:'影が多すぎます。手のひらに影が落ちない向きで撮影してください。',HIGHLIGHT_CLIPPED:'白飛びが多すぎます。フラッシュや強い反射を避けてください。',BLUR_DETECTED:'画像がぼやけています。スマホを固定し、手のひらにピントを合わせて撮影してください。'};
 return q.issues.map(x=>map[x]||x).join(' ');
}
