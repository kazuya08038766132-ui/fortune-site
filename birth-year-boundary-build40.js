export function yearBoundaryDateOnly({birthDate,risshunDate}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(birthDate||"")))return {status:"INVALID_DATE"};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(risshunDate||"")))return {status:"MISSING_RISSHUN"};
 if(birthDate===risshunDate)return {status:"BOUNDARY_UNCERTAIN",reason:"立春当日は出生時刻未入力のため年柱を断定しない"};
 return {status:"OK",pillarYear:birthDate<risshunDate?Number(birthDate.slice(0,4))-1:Number(birthDate.slice(0,4))};
}
