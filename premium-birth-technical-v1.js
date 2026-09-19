(() => {"use strict";
function build({year,month,day,dayMaster,fiveElements,tenGodSummary}={}){
 const unresolved=[["年柱",year],["月柱",month],["日柱",day]].filter(([,v])=>!v||!v.pillar);
 return {
  status:unresolved.length?"PARTIAL_VERIFIED":"VERIFIED_TECHNICAL_BLOCK",
  title:"生年月日から見る命式",
  rows:[
   {label:"年柱",value:year?.pillar||"境界確認中"},
   {label:"月柱",value:month?.pillar||"境界確認中"},
   {label:"日柱",value:day?.pillar||"確認中"},
   {label:"日主",value:dayMaster||day?.stem||"確認中"}
  ],
  fiveElements:fiveElements||null,tenGodSummary:tenGodSummary||null,
  unresolved:unresolved.map(x=>x[0]),
  note:"出生時刻は入力しません。未確定の節入り境界は推測せず、そのまま表示します。"
 };
}
window.PremiumBirthTechnicalV1={version:"PREMIUM_BIRTH_TECHNICAL_V1",build};
})();