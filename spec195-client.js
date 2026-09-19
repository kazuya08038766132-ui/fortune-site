(() => {
"use strict";
let csrfCache=null;
async function csrfToken(){
  if(csrfCache)return csrfCache;
  const r=await fetch("/api/csrf-token",{credentials:"same-origin"});
  const j=await r.json();
  if(!r.ok||!j.token)throw new Error(j.error||"安全確認を開始できません");
  csrfCache=j.token; return csrfCache;
}
function timeProfile(d=new Date()){
  if(window.FortuneTime?.profile){
    const p=window.FortuneTime.profile(d);
    const today=p.today||{}, week=Array.isArray(p.week)?p.week:[], month=p.month||{}, year=p.year||{};
    return {
      today:{theme:today.hint||"今日の流れ",text:"今日のテーマは「"+(today.hint||"整える")+"」。大きな断定ではなく、行動のヒントとして使ってください。"},
      week:{theme:"今週の流れ",text:week.length?week.map(x=>x.hint).filter(Boolean).join("・"):"7日間の流れを確認します。"},
      month:{theme:(month.month?month.month+"月":"今月")+"の流れ",text:month.note||"今月の流れを確認します。"},
      year:{theme:(year.year?year.year+"年":"今年")+"の流れ",text:year.note||"今年の流れを確認します。"},
      disclaimer:"時間運は行動の参考情報です。確定的な未来を示すものではありません。"
    };
  }
  const hints=["整える","始める","続ける","見直す","伝える","仕上げる","休む"],h=hints[d.getDay()];
  return {today:{theme:h,text:"今日のテーマは「"+h+"」。"},week:{theme:"今週",text:"一週間のペースを整えます。"},month:{theme:"今月",text:"今月の優先順位を確認します。"},year:{theme:"今年",text:"長期の方向性を確認します。"},disclaimer:"時間運は行動の参考情報です。"};
}
window.Spec195=Object.freeze({csrfToken,timeProfile});
})();