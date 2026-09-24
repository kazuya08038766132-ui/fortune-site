import {recoveryRateLimiter} from "./recovery-rate-limit-build40.js";
import {cleanupRecovery} from "./recovery-cleanup-build40.js";
export function createRecoveryOps(pool){
 const limiter=recoveryRateLimiter({pool,secret:process.env.RECOVERY_RATE_LIMIT_SECRET||""});
 return {limiter,cleanup:()=>cleanupRecovery(pool)};
}
