(() => {"use strict";
function resolve(chars,lookup){const out=[];let prev=null;for(const ch of [...String(chars||"")]){
 if(ch==="々"){if(!prev||prev.status!=="VERIFIED")return {status:"DATA_VERIFY",reason:"repeat_mark_previous_unverified",items:out};out.push({char:"々",strokes:prev.strokes,status:"VERIFIED_REPEAT",sourceChar:prev.char});continue}
 const x=lookup(ch);if(!x||x.status!=="VERIFIED")return {status:"DATA_VERIFY",reason:"unknown_character",char:ch,items:out};prev=x;out.push(x)}
 return {status:"VERIFIED",items:out,total:out.reduce((s,x)=>s+x.strokes,0)}}
window.NameRepeatMarkV1={version:"NAME_REPEAT_MARK_V1",resolve};
})();