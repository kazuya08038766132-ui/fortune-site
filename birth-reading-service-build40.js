import {verifiedSectionalTerms} from './birth-boundary-registry-build40.js';
import {yearBoundaryDateOnly} from './birth-year-boundary-build40.js';
import {boundaryForDateOnly} from './birth-boundary-engine-build40.js';
import {sexagenaryYear,sexagenaryMonth,composeFreeBirthCards,composePremiumBirthCards} from './fortune-reading-build40.js';
import {sexagenaryDay} from './birth-day-pillar-build40.js';
import {validateBirthDate} from './birth-date-policy-build40.js';

export function buildBirthReading(birthDate,options={}){
 const policy=validateBirthDate(birthDate,options);
 if(!policy.ok)return {status:policy.status,birthDate:String(birthDate||''),allowed:{min:policy.min,max:policy.maxAllowed}};
 const year=Number(birthDate.slice(0,4)),pack=verifiedSectionalTerms(year);
 if(pack.status!=='VERIFIED')return {status:'OUT_OF_VERIFIED_RANGE',birthDate};
 const risshun=pack.terms.find(x=>x.term==='立春');
 const yearBoundary=yearBoundaryDateOnly({birthDate,risshunDate:risshun?.date});
 const monthBoundary=boundaryForDateOnly({birthDate,terms:pack.terms});
 if(yearBoundary.status!=='OK'||monthBoundary.status!=='OK')return {status:'BOUNDARY_UNCERTAIN',birthDate,yearBoundary,monthBoundary};
 const yearPillar=sexagenaryYear(yearBoundary.pillarYear),monthPillar=sexagenaryMonth(yearBoundary.pillarYear,monthBoundary.monthNo),dayPillar=sexagenaryDay(birthDate);
 if(dayPillar.status!=='OK')return {status:'INVALID_DATE'};
 const freeCards=composeFreeBirthCards({yearPillar,monthPillar,boundary:monthBoundary});
 const premiumCards=composePremiumBirthCards({yearPillar,monthPillar,dayPillar,monthBoundary});
 return {status:'OK',birthDate,yearBoundary,monthBoundary,yearPillar,monthPillar,dayPillar,dayMaster:{stem:dayPillar.dayMaster,element:dayPillar.element,yinYang:dayPillar.yinYang},freeCards,premiumCards,convention:{timezone:'Asia/Tokyo',birthTime:'omitted',dayBoundary:'civil date 00:00',hourPillar:'omitted'}};
}
