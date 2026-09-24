import pg from 'pg';
import Stripe from 'stripe';
import {createIntegratedBuild40} from './server-integrated-build40.js';
import {getReleaseVersion} from './release-version-build40.js';
import {ensureBuild40Schema} from './build40-schema.js';
import {ensureIntegrationSchema} from './integration-schema-v2-build40.js';
import {ensureRuntimeSchema} from './runtime-schema-build40.js';
import {createIntegratedCsrfAdapter,createIntegratedR2Adapter,createIntegratedResendAdapter,createIntegratedStripeEvents,createIntegratedRecovery,createIntegratedVerification,createIntegratedReadiness} from './integrated-runtime-adapters-build40.js';

const {Pool}=pg;
const port=Number(process.env.PORT||3000);
const baseUrl=process.env.PUBLIC_BASE_URL||`http://127.0.0.1:${port}`;
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?{rejectUnauthorized:false}:undefined});
const stripe=process.env.STRIPE_SECRET_KEY?new Stripe(process.env.STRIPE_SECRET_KEY):null;
const csrf=createIntegratedCsrfAdapter(pool);
const r2=createIntegratedR2Adapter(pool);
const resend=createIntegratedResendAdapter(pool);
const recovery=createIntegratedRecovery(pool);
const verification=createIntegratedVerification(pool,resend);
const readiness=createIntegratedReadiness(pool);
const stripeEvents=createIntegratedStripeEvents(pool,stripe);
const app=createIntegratedBuild40({pool,stripe,baseUrl,priceYen:Number(process.env.DETAIL_PRICE_YEN||980),membershipPriceYen:Number(process.env.MEMBERSHIP_PRICE_YEN||490),csrf,r2,resend,recovery,verification,readiness,stripeEvents});

async function start(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL required');
 if(!process.env.CSRF_SECRET||process.env.CSRF_SECRET.length<32)throw Error('CSRF_SECRET must be >=32 chars');
 if(process.env.NODE_ENV==='production'&&!process.env.PUBLIC_BASE_URL)throw Error('PUBLIC_BASE_URL required in production');
 await ensureRuntimeSchema(pool);
 await ensureBuild40Schema(pool);
 await ensureIntegrationSchema(pool);
 const v=getReleaseVersion();
 app.listen(port,'0.0.0.0',()=>console.log(`fortune-site ${v.build} / RC${v.rc ?? 'unknown'} listening on ${port}`));
}
if(process.env.BUILD40_NO_LISTEN!=='1')start().catch(e=>{console.error('fortune-site startup failed',e);process.exit(1)});
export {app,start};
