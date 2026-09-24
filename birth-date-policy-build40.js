export const VERIFIED_BIRTH_MIN='1955-01-01';
export const VERIFIED_BIRTH_MAX='2027-12-31';

function pad2(n){return String(n).padStart(2,'0')}
export function jstTodayIso(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=t=>parts.find(x=>x.type===t)?.value;
  return `${get('year')}-${pad2(get('month'))}-${pad2(get('day'))}`;
}
export function isRealIsoDate(value){
  const s=String(value||'');
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return false;
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  const dt=new Date(Date.UTC(y,mo-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d;
}
export function birthDateMaxAllowed({todayJst=jstTodayIso(),verifiedMax=VERIFIED_BIRTH_MAX}={}){
  return todayJst<verifiedMax?todayJst:verifiedMax;
}
export function validateBirthDate(value,{todayJst=jstTodayIso(),min=VERIFIED_BIRTH_MIN,verifiedMax=VERIFIED_BIRTH_MAX}={}){
  const birthDate=String(value||'');
  const maxAllowed=birthDateMaxAllowed({todayJst,verifiedMax});
  if(!isRealIsoDate(birthDate))return {ok:false,status:'INVALID_DATE',birthDate,min,maxAllowed};
  if(birthDate<min||birthDate>verifiedMax)return {ok:false,status:'OUT_OF_VERIFIED_RANGE',birthDate,min,maxAllowed};
  if(birthDate>todayJst)return {ok:false,status:'FUTURE_DATE',birthDate,min,maxAllowed};
  return {ok:true,status:'OK',birthDate,min,maxAllowed};
}
