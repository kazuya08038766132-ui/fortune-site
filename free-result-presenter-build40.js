import {loadFortuneDraft} from './fortune-draft-store-build40.js';
import {composeFriendlyFreeReading,buildFriendlyReadingEvidence} from './free-reading-synthesis-build40.js';

const grid=document.querySelector('#resultGrid');
const summary=document.querySelector('#resultSummary');

function node(tag,className,text){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=String(text);
 return el;
}

function renderFriendly(){
 if(!grid)return;
 if(grid.querySelectorAll('.friendly-result-card').length===7)return;
 const loaded=loadFortuneDraft();
 if(loaded.status!=='OK')return;
 const d=loaded.draft;
 if(!d?.birthDate||!Array.isArray(d.freeCards))return;

 const cards=composeFriendlyFreeReading({
  birthCards:d.freeCards,
  nameReading:d.nameReading||null,
  fullName:d.fullName||`${d.familyName||''}${d.givenName||''}`
 });
 if(cards.length!==7)return;

 const frag=document.createDocumentFragment();
 for(const c of cards){
  const article=node('article','card result-card friendly-result-card');
  const h3=node('h3');
  h3.append(document.createTextNode(c.title+' '));
  h3.append(node('span','pill',c.value));
  article.append(h3,node('p','',c.text));
  frag.append(article);
 }

 const evidence=buildFriendlyReadingEvidence({
  birthCards:d.freeCards,
  nameReading:d.nameReading||null,
  yearPillar:d.yearPillar||null,
  monthPillar:d.monthPillar||null
 });
 const details=node('details','card reading-evidence');
 const detailsSummary=node('summary','',"鑑定の根拠を見る");
 details.append(detailsSummary,node('p','mini',evidence.note));
 if(evidence.birth.length)details.append(node('p','mini',`生年月日：${evidence.birth.join(' ／ ')}`));
 if(evidence.name.length)details.append(node('p','mini',`姓名判断：${evidence.name.join(' ／ ')}`));
 else if(evidence.nameStatus!=='OK')details.append(node('p','mini','姓名判断は確認できたデータだけを使い、未確認の場合は推測していません。'));
 frag.append(details);

 if(d.palm?.readingStatus==='READY'){
  const p=node('p','');
  const a=node('a','btn ghost','手相レポートを開く');
  a.href='palm-report-build40.html';
  p.append(a);
  frag.append(p);
 }

 grid.replaceChildren(frag);
 if(summary){
  const fullName=d.fullName||`${d.familyName||''}${d.givenName||''}`;
  summary.textContent=fullName?`${fullName}さんの無料鑑定結果`:'無料鑑定結果';
 }
}

if(grid){
 const observer=new MutationObserver(()=>queueMicrotask(renderFriendly));
 observer.observe(grid,{childList:true});
 renderFriendly();
}
