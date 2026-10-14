// Presentation only: receives already-authorized server data, never composes paid text.
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
function textSection(s){const a=el('article','reading-section');a.append(el('h4','',s.title));if(s.value)a.append(el('span','reading-keyword',s.value));a.append(el('p','',s.text));return a;}

function diagram(v){
 const out=el('div','fortune-diagram');
 if(v.kind==='birth-chart'){
  out.append(el('h4','','あなたの命式'));
  const grid=el('div','pillar-grid');
  for(const p of v.pillars){const c=el('div','pillar');c.append(el('span','pillar-label',p.label),el('strong','pillar-stem',p.stem),el('strong','pillar-branch',p.branch),el('span','',`${p.yinYang}・${p.element}`));grid.append(c);}
  out.append(grid,el('p','day-master',`あなたの中心：${v.dayMaster.stem}（${v.dayMaster.yinYang}の${v.dayMaster.element}）`));
  out.append(el('h4','','三柱の天干・五行構成'));
  const bars=el('div','element-bars');
  for(const x of v.elements){const row=el('div','element-row');row.append(el('span','',x.element));const track=el('div','element-track');const fill=el('div','element-fill');fill.style.width=`${x.count/3*100}%`;track.append(fill);row.append(track,el('span','',`${x.count} / 3`));bars.append(row);}
  out.append(bars,el('p','diagram-caption',v.yinYang.map(x=>`${x.label}${x.count}`).join(' ／ ')),el('p','diagram-caption',v.scope));
 }else if(v.kind==='name-chart'){
  out.append(el('h4','','あなたのお名前と五格'));
  const name=el('div','name-characters');
  for(const group of [v.family,v.given]){const col=el('div','name-column');for(const c of group){const row=el('div','name-character');row.append(el('strong','',c.char||c.character),el('span','',`${c.stroke}画・${c.stroke%2?'陽':'陰'}`));col.append(row);}name.append(col);}
  out.append(name);
  const five=el('div','five-grid');
  for(const e of v.numerology){const c=el('div',`five-grid-cell ${e.key==='total'?'five-grid-total':''}`);c.append(el('span','',e.label),el('strong','',`${e.number}画`),el('span','rating',e.rating),el('small','',e.theme));five.append(c);}
  out.append(five);
  if(v.sansai?.status==='OK')out.append(el('p','diagram-caption',`三才・五行：${v.sansai.pattern} ／ ${v.sansai.balance}`));
  if(v.yinYang?.status==='OK')out.append(el('p','diagram-caption',`陰陽：${v.yinYang.display} ／ ${v.yinYang.balance}`));
 }else if(v.kind==='palm-chart'){
  const labels={life:'生命線',head:'頭脳線',heart:'感情線',fate:'運命線',sun:'太陽線',wealth:'財運線',marriage:'結婚線'};
  const colors={life:'#bf3838',head:'#286aac',heart:'#a13480',fate:'#6552a3',sun:'#a56b11',wealth:'#167467',marriage:'#964561'};
  const photo=document.querySelector('#palmPreview');
  if(photo?.src){
   const stage=el('div','report-palm-stage'),img=el('img','report-palm-photo');img.src=photo.src;img.alt='今回選択した手のひら写真';stage.append(img);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1000 1000');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
   // Overlay points must come from the independently verified server inference.
   for(const key of v.confirmedLines||[]){const points=v.geometry?.lines?.[key];if(!Array.isArray(points)||points.length<2||points.length>500)continue;
    if(!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1)))continue;
    const path=document.createElementNS('http://www.w3.org/2000/svg','polyline');path.setAttribute('points',points.map(p=>`${p[0]*1000},${p[1]*1000}`).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',colors[key]||'#6552a3');path.setAttribute('stroke-width','5');path.setAttribute('vector-effect','non-scaling-stroke');svg.append(path);
   }
   if(svg.childNodes.length)stage.append(svg);out.append(stage);
  }
  out.append(el('p','diagram-caption',`確認できた線：${(v.confirmedLines||[]).map(k=>labels[k]||k).join('・')}`));
 }
 return out;
}

export function renderMethodReport(report){
 const wrap=el('section','fortune-method');wrap.dataset.fortuneType=report.type;wrap.dataset.access=report.access;
 wrap.append(el('h3','method-label',report.label),el('h4','method-title',report.title));
 if(report.status!=='OK'){
  wrap.append(el('p','reading-pending',report.summary));return wrap;
 }
 if(report.visual)wrap.append(diagram(report.visual));
 const sections=el('div','reading-sections');for(const s of report.sections||[])sections.append(textSection(s));wrap.append(sections);
 if(report.detailSections?.length){const more=el('div','reading-details');more.append(el('h3','','さらに詳しいあなたの鑑定'));for(const s of report.detailSections)more.append(textSection(s));wrap.append(more);}
 if(report.evidence){
  const evidence=el('details','reading-evidence');evidence.append(el('summary','','鑑定の根拠を見る'));
  if(report.type==='name'){
   evidence.append(el('p','',Object.entries(report.evidence.formula||{}).map(([k,v])=>`${({heaven:'天格',person:'人格',earth:'地格',outer:'外格',total:'総格'})[k]}：${v}`).join('。')));
  }else if(report.type==='shichusuimei')evidence.append(el('p','',report.evidence.pillars.map(p=>`${p.label} ${p.value}`).join(' ／ ')),el('p','','暦日は日本時間、出生時刻・時柱は省略します。'));
  else evidence.append(el('p','','昇格済みモデルと保存済みの解析根拠を確認した結果だけを表示しています。'));
  if(report.note)evidence.append(el('p','',report.note));wrap.append(evidence);
 }
 return wrap;
}

export function renderTeaser(teaser){
 const card=el('article',`teaser-card ${teaser.type==='integrated'?'integrated-teaser':''}`);card.dataset.fortuneType=teaser.type;card.dataset.access='teaser';
 const top=el('div','teaser-visible');top.append(el('h3','',teaser.label),el('h4','',teaser.title));
 if(teaser.visualHeader){
  const v=teaser.visualHeader,head=el('div','teaser-visual-head');head.setAttribute('aria-label',v.label);
  if(v.kind==='name-chart'){for(const c of v.characters||[])head.append(el('span','',`${c.char} ${c.stroke}画`));}
  else if(v.kind==='birth-chart'){head.append(el('span','',`年柱 ${v.firstStem}`),el('span','','月柱'),el('span','','日柱'));}
  else head.append(el('span','',v.label));
  top.append(head);
 }
 top.append(el('p','',teaser.excerpt));card.append(top);
 const shape=el('div','teaser-decoration');shape.setAttribute('aria-hidden','true');
 for(let i=0;i<4;i++)shape.append(el('span','teaser-placeholder'));
 card.append(shape,el('p','teaser-lock',teaser.lockText));return card;
}

export function renderFreeFunnel(grid,data){
 if(data.schema!=='fortune-funnel-v1'||data.paid!==false||data.teasers?.length!==2)throw Error('INVALID_FREE_RESPONSE');
 const frag=document.createDocumentFragment();frag.append(renderMethodReport(data.selected));
 const next=el('div','fortune-teasers');for(const t of data.teasers)next.append(renderTeaser(t));frag.append(next,renderTeaser(data.integrationTeaser));
 grid.replaceChildren(frag);
}

export function renderPaidFunnel(body,data){
 if(data.schema!=='fortune-funnel-v1'||data.paid!==true||data.reports?.length!==3)throw Error('INVALID_PAID_RESPONSE');
 const frag=document.createDocumentFragment();for(const r of data.reports)frag.append(renderMethodReport(r));
 const compare=el('section','fortune-comparison');compare.append(el('h2','','3占術を見比べる'),el('p','',data.comparisonRule));
 const scroller=el('div','comparison-scroll');const table=el('table');const caption=el('caption','','各占術で確認できた特徴');table.append(caption);
 const head=el('thead');const tr=el('tr');for(const t of ['運勢','四柱推命','姓名判断','手相']){const th=el('th','',t);th.scope='col';tr.append(th);}head.append(tr);table.append(head);
 const tb=el('tbody');for(const row of data.comparison){const tr=el('tr');const label=el('th','',row.label);label.scope='row';tr.append(label);for(const c of row.cells)tr.append(el('td','',c.label));tb.append(tr);}table.append(tb);scroller.append(table);compare.append(scroller);frag.append(compare);
 const integrated=el('section','fortune-integrated');integrated.append(el('h2','',data.integrated.title),el('p','',data.integrated.summary));
 for(const s of data.integrated.sections||[])integrated.append(textSection(s));frag.append(integrated);
 body.replaceChildren(frag);
}
