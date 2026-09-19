(() => {"use strict";
const BOUNDARY_MONTHS=Object.freeze({2:"立春",3:"啓蟄",4:"清明",5:"立夏",6:"芒種",7:"小暑",8:"立秋",9:"白露",10:"寒露",11:"立冬",12:"大雪",1:"小寒"});
function boundaryPolicy(iso){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||""));if(!m)return {status:"INVALID_DATE"};
 const month=+m[2],day=+m[3],term=BOUNDARY_MONTHS[month];
 // Without birth time, exact same-day term switching must not be fabricated.
 const approximateWindow=day>=3&&day<=8;
 return approximateWindow?{status:"BOUNDARY_REVIEW",term,message:`${term}付近です。出生時刻を入力させない設計のため、節入り当日の厳密な月柱切替は断定しません。`}
 :{status:"DATE_ONLY_SAFE",term};
}
window.BirthBoundaryPolicy={version:"BIRTH_BOUNDARY_DATE_ONLY_V1",boundaryPolicy};
})();