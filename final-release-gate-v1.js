(() => {"use strict";
const REQUIRED=Object.freeze({
legalSellerIdentity:false,contactChannel:false,nameMaster:false,birthBoundaryMaster:false,palmProductionModel:false,
stripeE2E:false,r2E2E:false,resendE2E:false
});
function status(){const missing=Object.entries(REQUIRED).filter(([,v])=>!v).map(([k])=>k);return {productionReady:missing.length===0,missing}}
window.FortuneFinalReleaseGate={version:"FINAL_RELEASE_GATE_V1",required:REQUIRED,status};
})();