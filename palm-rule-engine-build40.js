
const RULESET_VERSION="modern-palmistry-editorial-v3";
const ok=(l,min=.72)=>l?.state==="DETECTED"&&Number(l.confidence)>=min;
const num=(x)=>Number.isFinite(Number(x))?Number(x):null;
const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const lineEvidenceConfidence=l=>clamp(Math.min(Number(l?.confidence)||0,Number(l?.evidence?.semanticConfidence??l?.confidence)||0,Number(l?.evidence?.evidenceQuality??l?.confidence)||0));
const push=(a,x,line)=>a.push(Object.freeze({tradition:"手相占いとしての一般的な解釈",rulesetVersion:RULESET_VERSION,evidenceConfidence:lineEvidenceConfidence(line),...x}));
export function evaluatePalmRules(feature){
 const out=[],L=feature?.lines||{};
 const life=L.life,head=L.head,heart=L.heart,fate=L.fate,sun=L.sun,wealth=L.wealth,marriage=L.marriage;
 if(ok(life)){
   const f=life.features||{},len=num(f.lengthRatio),dep=num(f.meanDepth??f.depth),cur=num(f.curvature),shape=life.semantic?.shapeProfile||{};
   if(len!==null&&len<.45)push(out,{ruleId:"LIFE_SHORT",line:"life",priority:39,tags:["切替","集中"],text:"生命線は比較的短めです。手相では、長さだけで体力や寿命を判断せず、限られた範囲へ力を集中しやすい相として読みます。"},life);
   if(len!==null&&len>=.75)push(out,{ruleId:"LIFE_LONG",line:"life",priority:50,tags:["持久力","継続"],text:"生命線が比較的長く伸びています。手相では、物事を長く続ける粘り強さを表す線として読みます。"},life);
   if(dep!==null&&dep>=.65)push(out,{ruleId:"LIFE_DEEP",line:"life",priority:45,tags:["安定","行動"],text:"生命線が比較的はっきりしています。手相では、行動の軸がぶれにくいタイプとして解釈します。"},life);
   if(cur!==null&&cur>=.65)push(out,{ruleId:"LIFE_WIDE_ARC",line:"life",priority:40,tags:["活動性"],text:"生命線のカーブが大きめです。手相では、外へ意識を向けやすく活動範囲を広げやすい相として扱います。"},life);
   if(shape.shapeClass==="NARROW_ARC")push(out,{ruleId:"LIFE_NARROW_ARC",line:"life",priority:40,tags:["内向集中","慎重"],text:"生命線の弧はやや内側にまとまる形です。手相では、活動範囲をむやみに広げるより自分のペースを守りやすい傾向として読みます。"},life);
   if(shape.clarityClass==="FAINT")push(out,{ruleId:"LIFE_FAINT",line:"life",priority:38,tags:["繊細","省エネ"],text:"生命線はやや薄めに見えます。手相では、無理を重ねるより配分を意識して動くタイプとして読みます。"},life);
   if(shape.topologyClass==="BRANCHED"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"LIFE_BRANCH",line:"life",priority:42,tags:["選択肢","展開"],text:"生命線に枝分かれが見られます。手相では、生活や行動の方向を複数へ広げやすい相として読みます。"},life);
   if(shape.shapeClass==="WIDE_ARC")push(out,{ruleId:"LIFE_WIDE_ARC_PROFILE",line:"life",priority:41,tags:["活動性","広がり"],text:"生命線は母指球を大きく囲む形です。手相では、行動範囲を広げながら経験を積みやすい傾向として読みます。"},life);
   if((f.breakCount||0)>0)push(out,{ruleId:"LIFE_BREAK",line:"life",priority:60,tags:["転機"],text:"生命線に途切れ候補があります。手相では生活リズムや環境の切り替わりを示すサインとして読みますが、寿命や病気を意味するものではありません。"},life);
 }
 if(ok(head)){
   const f=head.features||{},s=num(f.slope),len=num(f.lengthRatio),shape=head.semantic?.shapeProfile||{};
   if(s!==null&&s<=-.22)push(out,{ruleId:"HEAD_DOWN",line:"head",priority:50,tags:["想像力","感性"],text:"知能線が下向き傾向です。手相では、想像力や感覚を使って考える傾向として読みます。"},head);
   else if(s!==null&&Math.abs(s)<.16)push(out,{ruleId:"HEAD_STRAIGHT",line:"head",priority:50,tags:["現実性","整理"],text:"知能線が比較的まっすぐです。手相では、情報を整理して現実的に考える傾向として読みます。"},head);
   if(len!==null&&len<.44)push(out,{ruleId:"HEAD_SHORT",line:"head",priority:39,tags:["即断","要点"],text:"知能線は比較的短めです。手相では、考えを長く引き延ばすより要点をつかんで判断しやすい傾向として読みます。"},head);
   if(len!==null&&len>=.72)push(out,{ruleId:"HEAD_LONG",line:"head",priority:40,tags:["集中","思考"],text:"知能線が長めです。手相では、一つのテーマを深く考え続けやすい相として扱います。"},head);
   
   if(head.semantic?.joinedToLifeStart===true)push(out,{ruleId:"HEAD_JOIN_LIFE",line:"head",priority:46,tags:["慎重","準備"],text:"知能線の起点が生命線に近い形です。手相では、最初に状況を確かめてから動く慎重さとして読みます。"},head);
   else if(head.semantic?.joinedToLifeStart===false)push(out,{ruleId:"HEAD_SEPARATE_LIFE",line:"head",priority:44,tags:["自立","決断"],text:"知能線の起点が生命線から離れる形です。手相では、自分の判断で動き出しやすい相として読みます。"},head);

   if(shape.shapeClass==="UPWARD")push(out,{ruleId:"HEAD_UPWARD",line:"head",priority:49,tags:["実利","向上"],text:"知能線はやや上向きに伸びる形です。手相では、成果や実利を意識して考えを組み立てやすい傾向として読みます。"},head);
   if(shape.clarityClass==="FAINT")push(out,{ruleId:"HEAD_FAINT",line:"head",priority:37,tags:["柔軟","感受"],text:"知能線はやや薄めです。手相では、考えを一つに固定せず周囲の情報を取り込みながら判断しやすい傾向として読みます。"},head);
   if(shape.topologyClass==="BROKEN"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"HEAD_BROKEN",line:"head",priority:45,tags:["切替","再構成"],text:"知能線に途切れ候補があります。手相では、考え方や関心の軸を途中で切り替えやすい相として読みます。"},head);
   if(shape.shapeClass==="DOWNWARD")push(out,{ruleId:"HEAD_SHAPE_DOWNWARD",line:"head",priority:51,tags:["想像力","感性"],text:"知能線全体は下向きに伸びる形です。手相では、イメージや感覚を使って考えやすい傾向として読みます。"},head);
   if((f.branchCount||0)>=2)push(out,{ruleId:"HEAD_BRANCH",line:"head",priority:42,tags:["多角的"],text:"知能線に複数の枝分かれ候補があります。手相では、考え方を一方向に固定せず複数の視点を使いやすい相として読みます。"},head);
 }
 if(ok(heart)){
   const f=heart.features||{},len=num(f.lengthRatio),dep=num(f.meanDepth??f.depth),shape=heart.semantic?.shapeProfile||{};
   if(len!==null&&len<.42)push(out,{ruleId:"HEART_SHORT",line:"heart",priority:39,tags:["さっぱり","自立"],text:"感情線は比較的短めです。手相では、感情を長く引きずるより気持ちを切り替えやすい傾向として読みます。"},heart);
   if(len!==null&&len>=.70)push(out,{ruleId:"HEART_LONG",line:"heart",priority:50,tags:["情の深さ","対人"],text:"感情線が長めです。手相では、人との関係や気持ちを丁寧に扱いやすい相として読みます。"},heart);
   if(dep!==null&&dep>=.65)push(out,{ruleId:"HEART_DEEP",line:"heart",priority:45,tags:["率直さ"],text:"感情線がはっきりしています。手相では、好き嫌いや大切にしたいものが比較的明確なタイプとして解釈します。"},heart);
   
   const hz=heart.semantic?.terminationZone;
   if(hz==="INDEX_SIDE")push(out,{ruleId:"HEART_END_INDEX",line:"heart",priority:48,tags:["理想","誠実"],text:"感情線が人差し指側へ向かう形です。手相では、関係性に理想や誠実さを求めやすい相として読みます。"},heart);
   if(hz==="BETWEEN_INDEX_MIDDLE")push(out,{ruleId:"HEART_END_BALANCED",line:"heart",priority:47,tags:["バランス","対人"],text:"感情線が人差し指と中指の間寄りへ向かう形です。手相では、感情と現実のバランスを取りやすい相として扱います。"},heart);

   if(shape.shapeClass==="STRAIGHT")push(out,{ruleId:"HEART_STRAIGHT",line:"heart",priority:43,tags:["冷静","現実的"],text:"感情線は比較的まっすぐです。手相では、感情を整理しながら対人関係を現実的に捉えやすい傾向として読みます。"},heart);
   if(shape.clarityClass==="FAINT")push(out,{ruleId:"HEART_FAINT",line:"heart",priority:37,tags:["繊細","控えめ"],text:"感情線はやや薄めです。手相では、感情を強く表に出すより内側で調整しやすい傾向として読みます。"},heart);
   if(shape.topologyClass==="BROKEN"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"HEART_BROKEN",line:"heart",priority:45,tags:["感情の切替","距離感"],text:"感情線に途切れ候補があります。手相では、対人感情の持ち方を場面ごとに切り替えやすい相として読みます。"},heart);
   if(shape.shapeClass==="CURVED")push(out,{ruleId:"HEART_CURVED_PROFILE",line:"heart",priority:43,tags:["感情表現","対人"],text:"感情線はカーブを描く形です。手相では、対人場面で感情を反応として表しやすい傾向として読みます。"},heart);
   if((f.branchCount||0)>=2)push(out,{ruleId:"HEART_BRANCH",line:"heart",priority:42,tags:["共感","柔軟"],text:"感情線に枝分かれ候補があります。手相では、相手に合わせて感情表現を調整しやすい相として扱います。"},heart);
 }
 if(ok(fate,.76)){
   const f=fate.features||{},shape=fate.semantic?.shapeProfile||{};
   
   const oz=fate.semantic?.originZone;
   if(oz==="WRIST_CENTER")push(out,{ruleId:"FATE_FROM_WRIST",line:"fate",priority:43,tags:["積み上げ","方向性"],text:"運命線が手首中央寄りから伸びる形です。手相では、早い段階から自分の軸を積み上げる相として読みます。"},fate);
   if(oz==="THUMB_SIDE")push(out,{ruleId:"FATE_FROM_THUMB",line:"fate",priority:42,tags:["支え","縁"],text:"運命線が親指側から入る形です。手相では、身近な人との縁や支えが方向性に関わりやすい相として扱います。"},fate);

   if(shape.shapeClass==="SLANTED")push(out,{ruleId:"FATE_SLANTED",line:"fate",priority:41,tags:["柔軟な進路","変化"],text:"運命線はやや斜めに伸びる形です。手相では、一直線に進むより環境や縁に応じて方向を調整しやすい相として読みます。"},fate);
   if(shape.lengthClass==="SHORT")push(out,{ruleId:"FATE_SHORT",line:"fate",priority:38,tags:["局面集中","変化"],text:"運命線は比較的短めです。手相では、一生を一本の方針で貫くというより、時期ごとに重点を変えやすい相として読みます。"},fate);
   if(shape.clarityClass==="FAINT")push(out,{ruleId:"FATE_FAINT",line:"fate",priority:37,tags:["模索","柔軟"],text:"運命線はやや薄めです。手相では、役割や進路を固定せず試しながら形にしていく傾向として読みます。"},fate);
   if(shape.topologyClass==="BROKEN"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"FATE_BROKEN",line:"fate",priority:46,tags:["転機","再選択"],text:"運命線に途切れ候補があります。手相では、仕事や役割の方向を途中で選び直す節目として読むことがあります。"},fate);
   if(shape.topologyClass==="BRANCHED"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"FATE_BRANCH",line:"fate",priority:43,tags:["複線化","選択肢"],text:"運命線に枝分かれ候補があります。手相では、仕事や役割が一つに限られず複数の選択肢へ広がる相として読みます。"},fate);
   if(shape.terminationClass==="UPPER_PALM")push(out,{ruleId:"FATE_REACH_UPPER",line:"fate",priority:44,tags:["継続","方向性"],text:"運命線は手のひら上部まで伸びる形です。手相では、方向性を長く保ちながら積み上げる相として読みます。"},fate);
   if((f.continuity??0)>=.72)push(out,{ruleId:"FATE_CLEAR",line:"fate",priority:45,tags:["方向性","仕事"],text:"運命線が比較的連続して見えます。手相では、自分なりの方向性を持って積み上げやすい相として読みます。"},fate);
 }
 if(ok(sun,.78)){
   const f=sun.features||{},shape=sun.semantic?.shapeProfile||{};
   push(out,{ruleId:"SUN_VISIBLE",line:"sun",priority:35,tags:["表現","評価"],text:"太陽線が確認できます。手相では、表現したものが周囲から評価される流れを象徴する線として扱います。"},sun);
   if(shape.lengthClass==="LONG")push(out,{ruleId:"SUN_LONG",line:"sun",priority:40,tags:["継続","評価"],text:"太陽線は比較的長く伸びています。手相では、表現や評価が一時的ではなく積み重なりやすい相として読みます。"},sun);
   if(shape.clarityClass==="CLEAR")push(out,{ruleId:"SUN_CLEAR",line:"sun",priority:41,tags:["明確な表現","評価"],text:"太陽線が比較的はっきりしています。手相では、自分の強みや表現が周囲に伝わりやすい傾向として読みます。"},sun);
   if(shape.clarityClass==="FAINT")push(out,{ruleId:"SUN_FAINT",line:"sun",priority:34,tags:["模索","表現"],text:"太陽線はやや薄めです。手相では、評価を急ぐより自分の表現を育てながら形にしていく傾向として読みます。"},sun);
   if(shape.topologyClass==="BROKEN"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"SUN_BROKEN",line:"sun",priority:39,tags:["評価の波","再構成"],text:"太陽線に途切れ候補があります。手相では、評価や表現の方向を時期ごとに見直しながら進む相として読みます。"},sun);
   if(shape.topologyClass==="BRANCHED"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"SUN_BRANCH",line:"sun",priority:38,tags:["多彩","表現"],text:"太陽線に枝分かれ候補があります。手相では、評価される入口や表現方法が一つに限られにくい相として読みます。"},sun);
 }
 if(ok(wealth,.78)){
   const shape=wealth.semantic?.shapeProfile||{};
   push(out,{ruleId:"WEALTH_VISIBLE",line:"wealth",priority:35,tags:["管理","蓄積"],text:"財運線が確認できます。手相では、お金そのものの保証ではなく、資源を扱う意識や積み上げ方を見る補助線として読みます。"},wealth);
   if(shape.lengthClass==="LONG")push(out,{ruleId:"WEALTH_LONG",line:"wealth",priority:39,tags:["蓄積","管理"],text:"財運線は比較的長めです。手相では、資源やお金を短期的に使い切るより、継続して管理する意識につながる相として読みます。"},wealth);
   if(shape.clarityClass==="CLEAR")push(out,{ruleId:"WEALTH_CLEAR",line:"wealth",priority:40,tags:["管理","計画"],text:"財運線が比較的はっきりしています。手相では、収支や資源の扱いを自分なりに整理しやすい傾向として読みます。"},wealth);
   if(shape.clarityClass==="FAINT")push(out,{ruleId:"WEALTH_FAINT",line:"wealth",priority:33,tags:["柔軟管理","試行"],text:"財運線はやや薄めです。手相では、管理方法を固定せず試しながら自分に合う形へ整えやすい傾向として読みます。"},wealth);
   if(shape.topologyClass==="BRANCHED"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"WEALTH_BRANCH",line:"wealth",priority:37,tags:["複線化","管理"],text:"財運線に枝分かれ候補があります。手相では、資源の得方や使い方が一つに限られず複数の経路へ広がる相として読みます。"},wealth);
 }
 if(ok(marriage,.80)){
   const shape=marriage.semantic?.shapeProfile||{};
   push(out,{ruleId:"MARRIAGE_VISIBLE",line:"marriage",priority:30,tags:["関係性"],text:"結婚線候補が確認できます。手相では対人関係の節目を見る補助線として扱いますが、結婚時期や結果を断定するものではありません。"},marriage);
   if(shape.lengthClass==="LONG")push(out,{ruleId:"MARRIAGE_LONG",line:"marriage",priority:34,tags:["関係性","深まり"],text:"結婚線候補は比較的長めです。手相では、特定の関係をじっくり深めることを重視しやすい相として読みます。"},marriage);
   if(shape.clarityClass==="CLEAR")push(out,{ruleId:"MARRIAGE_CLEAR",line:"marriage",priority:35,tags:["関係性","意思"],text:"結婚線候補が比較的はっきりしています。手相では、人との関係で自分が大切にする基準を持ちやすい傾向として読みます。"},marriage);
   if(shape.shapeClass==="UPWARD")push(out,{ruleId:"MARRIAGE_UP",line:"marriage",priority:34,tags:["前向き","関係性"],text:"結婚線候補はやや上向きです。手相では、関係性を前向きに育てようとする姿勢の象徴として読みます。"},marriage);
   if(shape.shapeClass==="DOWNWARD")push(out,{ruleId:"MARRIAGE_DOWN",line:"marriage",priority:33,tags:["慎重","関係性"],text:"結婚線候補はやや下向きです。手相では、関係性を理想だけでなく現実面も含めて慎重に考えやすい相として読みます。"},marriage);
   if(shape.topologyClass==="BRANCHED"||shape.topologyClass==="BROKEN_AND_BRANCHED")push(out,{ruleId:"MARRIAGE_BRANCH",line:"marriage",priority:32,tags:["関係性","選択肢"],text:"結婚線候補に枝分かれが見られます。手相では、対人関係の価値観が一方向に固定されず、複数の考え方を持ちやすい相として読みます。"},marriage);
 }
 return Object.freeze(out.sort((a,b)=>b.priority-a.priority||a.ruleId.localeCompare(b.ruleId)));
}
