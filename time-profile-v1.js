(() => {"use strict";
function dayHint(d=new Date()){const k=d.getDay();return ["整える","始める","続ける","見直す","伝える","仕上げる","休む"][k]}
function profile(d=new Date()){const x=new Date(d),days=[];for(let i=0;i<7;i++){const q=new Date(x);q.setDate(x.getDate()+i);days.push({date:q.toISOString().slice(0,10),hint:dayHint(q)})}
return {version:"TIME_PROFILE_PRESENTATION_V1",today:{date:x.toISOString().slice(0,10),hint:dayHint(x)},week:days,month:{year:x.getFullYear(),month:x.getMonth()+1,note:"月の流れは正式な節入りMaster検証後に占術シグナルを接続します。"},year:{year:x.getFullYear(),note:"年の流れは立春境界Master検証後に接続します。"}}}
window.FortuneTime={profile};})();