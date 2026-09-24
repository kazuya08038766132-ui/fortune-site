import crypto from "crypto";
function secret(){const s=process.env.CSRF_SECRET||"";if(s.length<32)throw Error("CSRF_SECRET must be >=32 chars");return s}
function mac(sid,exp){return crypto.createHmac("sha256",secret()).update(`${sid}.${exp}`).digest("hex")}
export function issueCsrfV2(sid,ttlSeconds=3600){
 const exp=Math.floor(Date.now()/1000)+ttlSeconds;
 return `${exp}.${mac(sid,exp)}`;
}
export function verifyCsrfV2(sid,token){
 const [e,m]=String(token||"").split("."),exp=Number(e);
 if(!Number.isInteger(exp)||exp<Math.floor(Date.now()/1000)||!m)return false;
 const want=mac(sid,exp);
 if(m.length!==want.length)return false;
 try{return crypto.timingSafeEqual(Buffer.from(m),Buffer.from(want))}catch{return false}
}
export function createCsrfV2Middleware({ensureSession}){
 return function requireCsrfV2(req,res,next){
  const sid=ensureSession(req,res),got=String(req.get("x-csrf-token")||"");
  if(!verifyCsrfV2(sid,got))return res.status(403).json({error:"csrf_required"});
  next();
 }
}
