import crypto from "crypto";
export function normalizeEmail(v){return String(v||"").trim().toLowerCase()}
export function newOpaqueId(){return crypto.randomBytes(24).toString("hex")}
export function newRecoveryToken(){return crypto.randomBytes(32).toString("base64url")}
export function hashRecoveryToken(token,secret){
 return crypto.createHmac("sha256",secret).update(String(token)).digest("hex")
}
export const IDENTITY_POLICY=Object.freeze({
 anonymousCheckoutAllowed:true,
 emailVerificationRequiredForCrossDeviceRecovery:true,
 recoveryTokenSingleUse:true,
 recoveryTokenTtlMinutes:15,
 sessionRotateAfterRecovery:true,
 authTokensInWebStorage:false,
 rawRecoveryTokenStored:false
});
