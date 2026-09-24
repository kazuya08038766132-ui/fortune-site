export function configureProxyTrust(app){
 // Render sits behind a reverse proxy, but Express warns trust-proxy must match the exact proxy topology.
 // Default remains false. Operator may explicitly set TRUST_PROXY_HOPS only after validating deployment path.
 const n=Number(process.env.TRUST_PROXY_HOPS||0);
 if(Number.isInteger(n)&&n>0)app.set("trust proxy",n);
 return n;
}
export function recoveryClientIp(req){
 return String(req.ip||req.socket?.remoteAddress||"unknown").slice(0,200);
}
