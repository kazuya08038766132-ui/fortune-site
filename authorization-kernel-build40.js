export const PROTECTED_RESOURCES=Object.freeze(["order","reading","membership","consent","palm_asset","customer_portal","recovery"]);
export function authorize({resource,actorAccountId,ownerAccountId,anonymousSessionMatches=false,operation="read"}){
 if(!PROTECTED_RESOURCES.includes(resource))return {allow:false,reason:"UNKNOWN_RESOURCE"};
 if(resource==="recovery")return {allow:false,reason:"RECOVERY_REQUIRES_TOKEN_FLOW"};
 if(actorAccountId&&ownerAccountId&&actorAccountId===ownerAccountId)return {allow:true,reason:"ACCOUNT_OWNER"};
 if(!actorAccountId&&anonymousSessionMatches&&["order","reading"].includes(resource))return {allow:true,reason:"ANON_SESSION_OWNER"};
 return {allow:false,reason:"DENY_BY_DEFAULT"};
}
export function safeNotFound(res){
 const body={ok:false,error:"NOT_FOUND"};
 if(res&&typeof res.status==="function"&&typeof res.json==="function")return res.status(404).json(body);
 return {status:404,body};
}
