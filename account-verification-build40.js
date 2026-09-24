import crypto from "crypto";
export function normalizeEmailForLookup(v){
 const x=String(v||"").trim();const at=x.lastIndexOf("@");if(at<1||at===x.length-1||x.length>254)return null;
 const local=x.slice(0,at),domain=x.slice(at+1).toLowerCase();
 if(!local||!domain.includes(".")||/\s/.test(x))return null;
 return {original:x,lookup:`${local.toLowerCase()}@${domain}`};
}
export function newVerificationToken(){return crypto.randomBytes(32).toString("base64url")}
export function tokenHash(token,pepper){if(!pepper||pepper.length<32)throw Error("VERIFICATION_SECRET_REQUIRED");return crypto.createHmac("sha256",pepper).update(String(token)).digest("hex")}
export const VERIFICATION_POLICY=Object.freeze({ttlMinutes:30,singleUse:true,genericRequestResponse:true,autoClaimByEmail:false,rotateSessionOnConsume:true});
export function verificationRequestResponse(){return {ok:true,message:"確認可能な場合は、メールで手続きをご案内します。"}}
