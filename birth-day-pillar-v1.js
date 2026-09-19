(() => {"use strict";
const STEMS=[..."甲乙丙丁戊己庚辛壬癸"],BRANCHES=[..."子丑寅卯辰巳午未申酉戌亥"];
const MS=86400000,ANCHOR=Date.UTC(1940,0,22);
function valid(y,m,d){const t=new Date(Date.UTC(y,m-1,d));return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d}
function dayPillar(iso){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||""));if(!m)return {status:"INVALID_DATE"};
 const y=+m[1],mo=+m[2],d=+m[3];if(!valid(y,mo,d))return {status:"INVALID_DATE"};
 const days=Math.round((Date.UTC(y,mo-1,d)-ANCHOR)/MS),i=((days%60)+60)%60;
 return {status:"OK_DATE_ONLY",index:i,stem:STEMS[i%10],branch:BRANCHES[i%12],pillar:STEMS[i%10]+BRANCHES[i%12],
  dayBoundary:"CIVIL_DATE_00_JST_ASSUMPTION",note:"出生時刻を入力しないため、23時切替流派の境界判定は行いません。"};
}
window.BirthDayPillar={version:"DAY_PILLAR_ANCHOR_1940_01_22_V1",dayPillar};
})();