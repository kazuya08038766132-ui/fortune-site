function clean(v){return String(v??'').trim()}
export function getLegalSellerConfig(env=process.env){
  const sellerName=clean(env.LEGAL_SELLER_NAME);
  const sellerAddress=clean(env.LEGAL_SELLER_ADDRESS);
  const sellerPhone=clean(env.LEGAL_SELLER_PHONE);
  const contactEmail=clean(env.LEGAL_CONTACT_EMAIL);
  const missing=[];
  if(!sellerName)missing.push('sellerName');
  if(!sellerAddress)missing.push('sellerAddress');
  if(!sellerPhone)missing.push('sellerPhone');
  if(!contactEmail)missing.push('contactEmail');
  return {ready:missing.length===0,sellerName,sellerAddress,sellerPhone,contactEmail,missing};
}
export function publicLegalStatus(env=process.env){
  const x=getLegalSellerConfig(env);
  return {ready:x.ready,missingCount:x.missing.length};
}
