import crypto from 'crypto';

const buckets=new Map();
let lastSweep=0;

export function requestIdMiddleware(req,res,next){
  const incoming=String(req.get?.('x-request-id')||'').trim();
  const requestId=/^[A-Za-z0-9._:-]{8,128}$/.test(incoming)?incoming:crypto.randomUUID();
  req.build40RequestId=requestId;
  res.setHeader('X-Request-Id',requestId);
  next();
}

export function apiNoStore(req,res,next){
  if(String(req.path||'').startsWith('/api/')){
    res.setHeader('Cache-Control','no-store, private');
    res.setHeader('Pragma','no-cache');
  }
  next();
}

function sweep(now){
  if(now-lastSweep<60_000)return;
  lastSweep=now;
  for(const [k,v] of buckets){if(v.resetAt<=now)buckets.delete(k)}
}

export function rateLimit({name,limit,windowMs}){
  if(!name||!Number.isInteger(limit)||limit<1||!Number.isFinite(windowMs)||windowMs<1000)throw new Error('invalid rate limit policy');
  return function build40RateLimit(req,res,next){
    const now=Date.now(); sweep(now);
    const ip=String(req.ip||req.socket?.remoteAddress||'unknown');
    const key=`${name}:${ip}`;
    let b=buckets.get(key);
    if(!b||b.resetAt<=now){b={count:0,resetAt:now+windowMs};buckets.set(key,b)}
    b.count+=1;
    const remaining=Math.max(0,limit-b.count);
    res.setHeader('RateLimit-Limit',String(limit));
    res.setHeader('RateLimit-Remaining',String(remaining));
    res.setHeader('RateLimit-Reset',String(Math.ceil(b.resetAt/1000)));
    if(b.count>limit){
      res.setHeader('Retry-After',String(Math.max(1,Math.ceil((b.resetAt-now)/1000))));
      return res.status(429).json({error:'rate_limited',requestId:req.build40RequestId||null});
    }
    next();
  };
}

export function productionErrorHandler(err,req,res,_next){
  const requestId=req.build40RequestId||crypto.randomUUID();
  console.error('BUILD40 request failed',{requestId,method:req.method,path:req.path,errorCode:String(err?.code||err?.name||'internal_error').slice(0,80)});
  if(res.headersSent)return;
  res.status(500).json({error:'internal_error',requestId});
}

export function resetRateLimitsForTest(){buckets.clear();lastSweep=0;}
