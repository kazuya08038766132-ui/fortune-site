(() => {"use strict";
const STEMS=[..."甲乙丙丁戊己庚辛壬癸"], BRANCHES=[..."寅卯辰巳午未申酉戌亥子丑"];
// 五虎遁: 甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅.
const TIGER_START=Object.freeze({甲:"丙",己:"丙",乙:"戊",庚:"戊",丙:"庚",辛:"庚",丁:"壬",壬:"壬",戊:"甲",癸:"甲"});
function fromSolarMonth(yearStem,solarMonthIndex){
 if(!TIGER_START[yearStem]||!Number.isInteger(solarMonthIndex)||solarMonthIndex<0||solarMonthIndex>11)return {status:"INVALID_INPUT"};
 const start=STEMS.indexOf(TIGER_START[yearStem]), stem=STEMS[(start+solarMonthIndex)%10], branch=BRANCHES[solarMonthIndex];
 return {status:"OK_VERIFIED_RULE",yearStem,solarMonthIndex,stem,branch,pillar:stem+branch,
   guard:"solarMonthIndexは正確な十二節の境界判定後にだけ渡してください。"};
}
function guarded({yearStem,solarMonthIndex,boundaryStatus}={}){
 if(boundaryStatus!=="VERIFIED_EXACT")return {status:"BOUNDARY_REVIEW",message:"生年月日だけでは節入り当日の前後を確定できないため、月柱を断定しません。"};
 return fromSolarMonth(yearStem,solarMonthIndex);
}
window.BirthMonthPillarV1={version:"BIRTH_MONTH_PILLAR_V1",fromSolarMonth,guarded};
})();