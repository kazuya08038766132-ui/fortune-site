import fs from 'fs';
import path from 'path';
import {createRequire} from 'module';
import {fileURLToPath} from 'url';
const require=createRequire(import.meta.url);
const here=path.dirname(fileURLToPath(import.meta.url));
const requiredPackages=['express','pg','stripe','resend','@aws-sdk/client-s3','@aws-sdk/s3-request-presigner'];
const requiredProdEnv=['DATABASE_URL','CSRF_SECRET','PUBLIC_BASE_URL'];
const providerEnv={
 stripe:['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'],
 r2:['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET'],
 resend:['RESEND_API_KEY','RESEND_WEBHOOK_SECRET','EMAIL_FROM'],
 verification:['VERIFICATION_SECRET'],
 recovery:['RECOVERY_SECRET','RECOVERY_RATE_LIMIT_SECRET'],
 legal:['LEGAL_SELLER_NAME','LEGAL_SELLER_ADDRESS','LEGAL_SELLER_PHONE','LEGAL_CONTACT_EMAIL']
};
function packageCheck(name){try{return {name,ok:true,resolved:require.resolve(name)}}catch{return {name,ok:false,resolved:null}}}
function envPresent(name){const v=process.env[name];return typeof v==='string'&&v.trim().length>0}
export function inspectRuntime({production=process.env.NODE_ENV==='production'}={}){
 const packages=requiredPackages.map(packageCheck);
 const env=Object.fromEntries(requiredProdEnv.map(k=>[k,envPresent(k)]));
 const providers=Object.fromEntries(Object.entries(providerEnv).map(([k,keys])=>[k,{configured:keys.every(envPresent),missing:keys.filter(x=>!envPresent(x))}]));
 const csrfLen=(process.env.CSRF_SECRET||'').length;
 const checks={
  nodeMajor:Number(process.versions.node.split('.')[0]),
  serverEntrypoint:fs.existsSync(path.join(here,'server.js')),
  integratedServer:fs.existsSync(path.join(here,'server-integrated-build40.js')),
  dependenciesReady:packages.every(x=>x.ok),
  databaseConfigured:env.DATABASE_URL,
  csrfConfigured:env.CSRF_SECRET&&csrfLen>=32,
  publicBaseUrlConfigured:env.PUBLIC_BASE_URL
 };
 const startupReady=checks.serverEntrypoint&&checks.integratedServer&&checks.dependenciesReady&&checks.databaseConfigured&&checks.csrfConfigured&&(!production||checks.publicBaseUrlConfigured);
 return {build:'BUILD-40',production,checks,packages,env,providers,startupReady};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const r=inspectRuntime({production:process.argv.includes('--production')||process.env.NODE_ENV==='production'});
 console.log(JSON.stringify(r,null,2));
 if(process.argv.includes('--strict')&&!r.startupReady)process.exit(2);
}
