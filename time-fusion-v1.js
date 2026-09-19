(() => {"use strict";
const LEVELS=["YEAR","MONTH","DAY"];
function signal(level,tenGod,growth,relations=[]){
 if(!LEVELS.includes(level))return {status:"INVALID_LEVEL"};
 return {status:"OK_SIGNAL",level,tenGod:tenGod||null,growth:growth||null,relations:[...relations],
  guard:"時間運は傾向の整理であり、出来事の発生を保証しません。"};
}
function fuse({year,month,day}={}){
 const parts=[year,month,day].filter(x=>x?.status==="OK_SIGNAL");
 if(!parts.length)return {status:"INSUFFICIENT",hierarchy:[]};
 const hierarchy=["YEAR","MONTH","DAY"].map(level=>parts.find(x=>x.level===level)).filter(Boolean);
 return {status:"OK_TIME_FUSION",hierarchy,priority:"YEAR_CONTEXT__MONTH_THEME__DAY_TIMING",
  note:"年運を背景、月運をテーマ、日運を短期の動きとして重ねます。"};
}
function weekly(daily){
 const x=(daily||[]).slice(0,7);if(x.length!==7)return {status:"INSUFFICIENT"};
 return {status:"OK_WEEK_AGGREGATE",days:x,method:"7_DAILY_AGGREGATION"};
}
window.TimeFusionV1={version:"TIME_FUSION_V1",signal,fuse,weekly};
})();