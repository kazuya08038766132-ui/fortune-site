const byKey=(n,k)=>n?.entries?.find(x=>x.key===k)||null;
const ratingTone=r=>r==='大吉'?'強みが表れやすい':r==='吉'?'比較的安定しやすい':r==='半吉'?'良さと調整点が混在する':r==='凶'?'注意点を意識したい':'負荷への備えを意識したい';
export function synthesizeNameReading({numerology,sansai125,yinYang}={}){
 if(numerology?.status!=='OK'||sansai125?.status!=='OK'||yinYang?.status!=='OK')return {status:'DATA_VERIFY'};
 const p=byKey(numerology,'person'),e=byKey(numerology,'earth'),o=byKey(numerology,'outer'),t=byKey(numerology,'total'); if(!p||!e||!o||!t)return {status:'DATA_VERIFY'};
 const yy=`陰陽は「${yinYang.display}」で${yinYang.balance}`;
 return {status:'OK',headline:`人格${p.number}画「${p.theme}」を中心に、三才${sansai125.pattern}（${sansai125.type}）を重ねて読みます。`,sections:{personality:`人格は${p.number}画・${p.rating}。「${p.theme}」を中心に、${ratingTone(p.rating)}数理です。${sansai125.categories.personality}`,talentWork:`仕事・才能は人格の「${p.theme}」と三才を併読します。${sansai125.categories.work}`,money:`金運は総格${t.number}画・${t.rating}の長期傾向を主軸にします。${sansai125.categories.money}`,relationships:`対人運は外格${o.number}画・${o.rating}「${o.theme}」を主に見ます。${sansai125.categories.relationships}`,loveMarriage:`恋愛・結婚は地格${e.number}画・${e.rating}と人格を併読します。${sansai125.categories.loveMarriage}`,family:`家庭面は地格と三才の人格→地格を補助的に見ます。${sansai125.categories.family}`,lifeStages:`若年期は地格${e.number}画、中年期は人格${p.number}画、長期傾向は総格${t.number}画を中心に読み分けます。単一の格だけで人生全体を断定しません。`,yinYang:`${yy}。これは五格・81数理とは別の補助軸として扱います。`},policy:'NAME_COMPREHENSIVE_SEMANTIC_COMPOSITION_V1',disclaimer:'各項目は姓名判断上の伝統的解釈を整理したエンターテインメント情報です。結果は将来や能力を保証・断定するものではありません。'};
}
export const NAME_COMPREHENSIVE_VERSION='RC231-1';
