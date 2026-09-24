import {inspectRuntime} from './runtime-doctor-build40.mjs';
const production=process.env.NODE_ENV==='production';
const report=inspectRuntime({production});
if(!report.startupReady){
 console.error(JSON.stringify({error:'BUILD40_RUNTIME_NOT_READY',...report},null,2));
 process.exit(2);
}
await import('./server.js');
