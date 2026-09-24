import crypto from "crypto";
function key(){
 const raw=process.env.OUTBOX_ENCRYPTION_KEY||"";
 const b=Buffer.from(raw,"base64");
 if(b.length!==32)throw Error("OUTBOX_ENCRYPTION_KEY must be base64-encoded 32 bytes");
 return b;
}
export function sealSensitive(value){
 const iv=crypto.randomBytes(12), c=crypto.createCipheriv("aes-256-gcm",key(),iv);
 const ciphertext=Buffer.concat([c.update(JSON.stringify(value),"utf8"),c.final()]);
 return {v:1,alg:"A256GCM",iv:iv.toString("base64"),tag:c.getAuthTag().toString("base64"),ct:ciphertext.toString("base64")};
}
export function openSensitive(box){
 if(!box||box.v!==1||box.alg!=="A256GCM")throw Error("invalid sensitive envelope");
 const d=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(box.iv,"base64"));
 d.setAuthTag(Buffer.from(box.tag,"base64"));
 return JSON.parse(Buffer.concat([d.update(Buffer.from(box.ct,"base64")),d.final()]).toString("utf8"));
}
