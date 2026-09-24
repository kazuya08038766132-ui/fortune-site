import crypto from "crypto";
import {S3Client,PutObjectCommand,HeadObjectCommand,DeleteObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const ALLOWED = new Set(["image/jpeg","image/png","image/webp"]);
export function createR2(){
  const {R2_ACCOUNT_ID,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET}=process.env;
  if(!R2_ACCOUNT_ID||!R2_ACCESS_KEY_ID||!R2_SECRET_ACCESS_KEY||!R2_BUCKET)return null;
  return {bucket:R2_BUCKET,client:new S3Client({
    region:"auto",
    endpoint:`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials:{accessKeyId:R2_ACCESS_KEY_ID,secretAccessKey:R2_SECRET_ACCESS_KEY}
  })};
}
export function makePalmKey(sessionId,mime){
  if(!ALLOWED.has(mime))throw new Error("unsupported_content_type");
  const ext=mime==="image/png"?"png":mime==="image/webp"?"webp":"jpg";
  const owner=crypto.createHash("sha256").update(sessionId).digest("hex").slice(0,24);
  return `palm/${owner}/${crypto.randomUUID()}.${ext}`;
}
export async function presignPalmPut(r2,key,mime){
  if(!ALLOWED.has(mime))throw new Error("unsupported_content_type");
  return getSignedUrl(r2.client,new PutObjectCommand({Bucket:r2.bucket,Key:key,ContentType:mime}),{expiresIn:600});
}
export async function headPalm(r2,key){
  return r2.client.send(new HeadObjectCommand({Bucket:r2.bucket,Key:key}));
}
export async function deletePalm(r2,key){
  return r2.client.send(new DeleteObjectCommand({Bucket:r2.bucket,Key:key}));
}
