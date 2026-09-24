function deny(res,code=404){return res.status(code).json({error:code===404?"not_found":"forbidden"})}
export function createAuthorizedPalm(r2){
 return {
  async presign(req,res,ctx){
   if(!await r2.hasReadingConsent(ctx.sessionKey))return deny(res,403);
   return r2.presign(req,res,ctx);
  },
  async finalize(req,res,ctx){
   const assetId=String(req.body?.assetId||"").slice(0,160);
   if(!assetId||!await r2.ownsAsset(ctx.sessionKey,assetId))return deny(res,404);
   const head=await r2.headObject(ctx.sessionKey,assetId);
   if(!head?.exists)return res.status(409).json({error:"upload_not_found"});
   return r2.finalize(req,res,{...ctx,assetId,verifiedHead:head});
  },
  async delete(req,res,ctx){
   const assetId=String(req.body?.assetId||"").slice(0,160);
   if(!assetId||!await r2.ownsAsset(ctx.sessionKey,assetId))return deny(res,404);
   return r2.delete(req,res,{...ctx,assetId});
  }
 };
}
