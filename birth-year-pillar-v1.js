(() => {"use strict";
const S=[..."甲乙丙丁戊己庚辛壬癸"],B=[..."子丑寅卯辰巳午未申酉戌亥"];
function gregorianYearPillar(y){const i=((y-1984)%60+60)%60;return {index:i,stem:S[i%10],branch:B[i%12],pillar:S[i%10]+B[i%12]}}
function yearPillar(iso,boundary){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||""));if(!m)return {status:"INVALID_DATE"};
 const y=+m[1],mo=+m[2],d=+m[3],bp=boundary?.boundaryPolicy?.(iso);
 if(mo===2&&d>=3&&d<=5)return {status:"BOUNDARY_REVIEW",term:"立春",message:"立春の実時刻と出生時刻が必要なため年柱を断定しません。"};
 const effectiveYear=(mo<2||(mo===2&&d<=2))?y-1:y;
 return {status:"OK_DATE_ONLY",...gregorianYearPillar(effectiveYear),effectiveYear};
}
window.BirthYearPillar={version:"YEAR_PILLAR_LICHUN_SAFE_V1",yearPillar};
})();