(() => {"use strict";
const LABEL={ten:["天格","家系・土台"],jin:["人格","性格・中心運"],chi:["地格","基礎・若年期"],gai:["外格","対人・社会面"],sou:["総格","人生全体"]};
const ORDER=["ten","jin","chi","gai","sou"];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function chip(cls){return `<span class="nameFortuneClass c-${esc(cls||"確認中")}">${esc(cls||"確認中")}</span>`}
function overall(n){
 if(n?.status!=="OK_VERIFIED_NEW_FORM"||!n.formal)return null;
 const nu=n.formal.numerology||{}, g=n.formal.grids||{}, sa=n.formal.sansai||{};
 const weights={jin:4,sou:3,chi:2,gai:1,ten:1},score={吉:2,"半吉":1,凶:-2};
 let total=0,max=0; for(const k of ORDER){const w=weights[k],c=nu[k]?.fortune;total+=(score[c]||0)*w;max+=2*w}
 const label=total>=max*.55?"吉の要素が強い":total>0?"吉凶が混ざる":total===0?"バランス型":"注意点も活かしたい";
 return {label,total,method:"人格を最重視し、総格・地格・外格・天格を補助的に統合。独自の大吉/凶ランキングは作らない。",sansai:sa};
}
function render(n,fullName){
 if(n?.status!=="OK_VERIFIED_NEW_FORM"||!n.formal)return "";
 const parts=String(fullName||n.name||"").trim().split(/\s+/), surname=[...(parts[0]||"")], given=[...(parts[1]||"")];
 const ev=n.evidence||[], map=new Map(ev.map(x=>[x.char,x.strokes]));
 const chars=[...surname.map(c=>({c,s:"姓"})),...given.map(c=>({c,s:"名"}))];
 const g=n.formal.grids||{},nu=n.formal.numerology||{},ov=overall(n);
 const charHtml=chars.map(x=>`<div class="nameChar"><small>${x.s}</small><b>${esc(x.c)}</b><span>${esc(map.get(x.c)??"?")}画</span></div>`).join("");
 const cards=ORDER.map(k=>{const [title,role]=LABEL[k],num=g[k],cl=nu[k]?.fortune;return `<article class="nameGridCard"><div><strong>${title}</strong><small>${role}</small></div><b class="gridNumber">${esc(num)}画</b>${chip(cl)}</article>`}).join("");
 const sa=n.formal.sansai||{};
 return `<section class="nameFortuneVisual"><h3>姓名判断</h3><p class="nameLead">文字ごとの画数と、五格のどこを見ているかを分けて表示します。</p><div class="nameChars">${charHtml}</div><div class="nameGridList">${cards}</div><div class="nameOverall"><h4>姓名・総合判定</h4><p><b>${esc(ov.label)}</b></p><p>人格を中心に、総格・地格・外格・天格を重ねて判断します。三才は <b>${esc((sa.elements||[]).join("・")||"確認中")}</b>。吉凶の数だけで人物や人生を決めつけません。</p></div></section>`;
}
window.NameFortuneVisualV1={version:"NAME_FORTUNE_VISUAL_V1",render,overall};
})();