export function boundaryForDateOnly({birthDate,terms}){
 const date=String(birthDate||"");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return {status:"INVALID_DATE"};
 const same=terms.find(t=>t.date===date);
 if(same)return {status:"BOUNDARY_UNCERTAIN",term:same.term,date:same.date,timeJST:same.timeJST,
  reason:"節入り当日は出生時刻未入力のため前後を断定しない"};
 const prior=[...terms].filter(t=>t.date<date).sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
 if(!prior)return {status:"OUT_OF_VERIFIED_RANGE"};
 return {status:"OK",monthNo:prior.monthNo,boundary:prior};
}
