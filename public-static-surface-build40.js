import fs from 'fs';
import path from 'path';

const ROOT_FILES=new Set([
  'index.html','checkout-confirm.html','success.html','membership.html','membership-success.html','mypage.html','recover.html','verify-email.html','data-consent.html','premium-reading.html','palm-report-build40.html','palm-labeler-v2-build40.html','privacy.html','terms.html','tokusho.html','name-data-attribution-build40.html',
  'fortune-site-build40.css','rc278-ui-restore.css','palm-report-build40.css','palm-labeler-v2-build40.css',
  'fortune-app-build40.js','fortune-draft-store-build40.js','fortune-reading-build40.js','birth-date-policy-build40.js','birth-year-boundary-build40.js','birth-boundary-engine-build40.js','birth-boundary-registry-build40.js',
  'palm-analysis-pipeline-build40.js','palm-feature-validator-build40.js','palm-browser-e2e-build40.js','palm-browser-inference-adapter-build40.js','palm-browser-runtime-build40.js','palm-derived-semantics-build40.js','palm-geometry-build40.js','palm-hand-landmarker-build40.js','palm-image-preprocess-build40.js','palm-labeler-v2-build40.js','palm-line-analysis-build40.js','palm-local-preview-store-build40.js','palm-local-reading-build40.js','palm-mask-postprocess-build40.js','palm-quality-fusion-build40.js','palm-photo-quality-build40.js','palm-production-readiness-build40.js','palm-reading-composer-build40.js','palm-rule-engine-build40.js','palm-runtime-autoload-build40.js','palm-site-release-policy-build40.js','palm-ux-state-build40.js','palm-vision-backend-build40.js',
  'palm-single-image-stability-build40.js','palm-flow-controller-build40.js','palm-upload-client-build40.js','palm-history-snapshot-build40.js','browser-api-safe-build40.js',
  'palm-reading-stability-build40.js','palm-retake-guidance-build40.js','palm-repeat-smoothing-build40.js','palm-synthesis-build40.js','palm-line-confidence-gate-build40.js','palm-reading-coverage-gate-build40.js',
  'fortune-reader.png','magic-inner.png','magic-outer.png','magic-zodiac.png','hero-bg-mobile.png','hero-bg-pc.png','hero-moon.png','hero-title-mobile.png',
  'stars-mobile-a.png','stars-mobile-b.png','stars-mobile-c.png','stars-pc-a.png','stars-pc-b.png','stars-pc-c.png'
]);
for(let y=1955;y<=2027;y++)ROOT_FILES.add(`birth-boundary-${y}-naoj.js`);
const PUBLIC_DIRS=[
  {prefix:'vendor/onnxruntime-web/',ext:new Set(['.js','.mjs','.wasm'])},
  {prefix:'vendor/mediapipe/tasks-vision/',ext:new Set(['.js','.mjs','.wasm'])},
  {prefix:'models/',ext:new Set(['.onnx','.task','.json'])}
];
export function isPublicStaticPath(urlPath){
  const clean=decodeURIComponent(String(urlPath||'').split('?')[0]).replace(/^\/+/, '');
  if(!clean||clean.includes('..')||clean.includes('\\'))return false;
  if(ROOT_FILES.has(clean))return true;
  for(const d of PUBLIC_DIRS){if(clean.startsWith(d.prefix)&&d.ext.has(path.extname(clean).toLowerCase()))return true;}
  return false;
}
export function publicStaticMiddleware(root=process.cwd()){
  return (req,res,next)=>{
    if(req.method!=='GET'&&req.method!=='HEAD')return next();
    if(!isPublicStaticPath(req.path))return next();
    const rel=decodeURIComponent(req.path).replace(/^\/+/, '');
    const full=path.resolve(root,rel);
    if(!full.startsWith(path.resolve(root)+path.sep)&&full!==path.resolve(root,rel))return next();
    if(!fs.existsSync(full)||!fs.statSync(full).isFile())return next();
    res.sendFile(full);
  };
}
export function publicRootFiles(){return [...ROOT_FILES].sort();}
