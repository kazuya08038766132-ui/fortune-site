(() => {"use strict";
const LABEL={YEAR:"今年",MONTH:"今月",DAY:"今日"};
function plain(sig){
 if(!sig||sig.status!=="OK_SIGNAL")return "運勢データを確認中です。";
 const a=[];if(sig.tenGod)a.push(`${sig.tenGod}の要素`);if(sig.growth)a.push(`${sig.growth}の流れ`);
 return `${LABEL[sig.level]||"この期間"}は${a.length?a.join("と"):"大きな偏りを置かず"}、行動を決めつけず参考情報として見ていきます。`;
}
function profile(f){if(!f||f.status!=="OK_TIME_FUSION")return {status:"INSUFFICIENT"};return {status:"OK",year:plain(f.hierarchy.find(x=>x.level==="YEAR")),month:plain(f.hierarchy.find(x=>x.level==="MONTH")),day:plain(f.hierarchy.find(x=>x.level==="DAY"))}}
window.TimeGeneratorV1={version:"TIME_GENERATOR_V1",plain,profile};
})();