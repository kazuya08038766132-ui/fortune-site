(() => {"use strict";
const T=Object.freeze({
"子":["癸"],"丑":["己","癸","辛"],"寅":["甲","丙","戊"],"卯":["乙"],"辰":["戊","乙","癸"],"巳":["丙","庚","戊"],
"午":["丁","己"],"未":["己","丁","乙"],"申":["庚","壬","戊"],"酉":["辛"],"戌":["戊","辛","丁"],"亥":["壬","甲"]
});
function get(branch){const x=T[branch];return x?{status:"OK_MEMBERSHIP_ONLY",branch,hiddenStems:[...x],
 note:"蔵干の構成要素のみ。流派差のある日数配分・単一蔵干の選択・旺衰判定には使いません。"}:{status:"INVALID_BRANCH"}}
window.HiddenStemsMaster={version:"HIDDEN_STEMS_MEMBERSHIP_V1",table:T,get};
})();