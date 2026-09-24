const R={
  VERY_GOOD:'大吉', GOOD:'吉', MIXED:'半吉', BAD:'凶', VERY_BAD:'大凶'
};

// RC86 fixed 1-81 table. 82+ is intentionally not folded back into 1-81.
// Categories are based on the traditional 81-number fortune-telling convention;
// explanatory copy below is original site copy and is presented as entertainment.
const ratings=[
 null,
 '大吉','凶','大吉','凶','大吉','大吉','吉','吉','凶','凶',
 '大吉','凶','大吉','凶','大吉','大吉','吉','吉','凶','凶',
 '大吉','凶','大吉','大吉','吉','凶','凶','凶','吉','半吉',
 '大吉','大吉','大吉','大凶','吉','凶','大吉','半吉','吉','凶',
 '大吉','凶','凶','大凶','大吉','凶','大吉','大吉','凶','凶',
 '半吉','吉','凶','大凶','半吉','凶','吉','半吉','凶','凶',
 '大吉','凶','大吉','大凶','大吉','凶','大吉','大吉','凶','凶',
 '半吉','凶','半吉','凶','半吉','凶','半吉','半吉','凶','凶','大吉'
];

const themes=[
 null,
 '始まりと自立','受容と調整','明るい発展','変化への耐性','調和と安定','周囲の支え','意志と独立','積み重ね','感受性と揺れ','空転への注意',
 '再生と成長','繊細さと自律','知性と表現','変動と節度','福徳と包容','統率と信頼','前進力','責任ある発展','才気と障害','内省と転換',
 '主導と成功','中断への備え','躍動と名声','蓄積と実り','個性と才知','挑戦と変化','自尊と柔軟性','変転への適応','知略と行動','浮沈と選択',
 '知恵と統率','好機と援助','強い達成力','混乱への備え','学びと平穏','消耗を防ぐ','誠実な成就','技芸と晩成','包容と活力','集中の必要',
 '実力と徳望','多才の整理','華やかさと実質','急変への備え','大志と伸長','停滞の打開','実りと幸福','参謀力','変化への柔軟性','盛衰の管理',
 '転機と調整','先見と計画','内外差の調整','損失への備え','複雑さの均衡','停滞からの実行','実直さ','晩成と安定','持続力の確保','方針の整理',
 '自立と繁栄','孤立を避ける','継続的な伸長','再設計','長期安定','障害との向き合い','実業と独立','工夫と研究','休息と再整備','再考と立て直し',
 '進取と守成','表裏の点検','平穏と着実さ','適所を探す','維持と守成','協力で難局を越える','節度と中庸','管理と備蓄','研鑽と立て直し','休養と再構築','完成と新しい循環'
];

const role={
 heaven:{label:'天格',summary:'家系・姓から受ける土台をみる補助的な格です。'},
 person:{label:'人格',summary:'姓名判断の中心として、性質や判断傾向をみる格です。'},
 earth:{label:'地格',summary:'名前側の性質や若年期・内面的な傾向をみる格です。'},
 outer:{label:'外格',summary:'対人関係や外から見える関わり方の傾向をみる格です。'},
 total:{label:'総格',summary:'姓名全体のまとまりや長期的な傾向をみる格です。'}
};

function ratingAdvice(rating){
 if(rating==='大吉')return '強みが出やすい数とされます。長所を過信せず、周囲との調和を意識すると活かしやすいと読みます。';
 if(rating==='吉')return '比較的安定した数とされます。持ち味を継続して育てる読みをします。';
 if(rating==='半吉')return '良さと注意点の両方を持つ数とされます。状況に応じた調整が重要と読みます。';
 if(rating==='凶')return '課題が表れやすい数とされます。弱点の断定ではなく、注意点を意識するための参考として扱います。';
 return '負荷や変化が大きい数とされます。将来を断定せず、備えや環境調整の観点で読みます。';
}

export function numerology81(number){
 const n=Number(number);
 if(!Number.isInteger(n)||n<1)return {status:'INVALID_NUMBER'};
 if(n>81)return {status:'OUT_OF_RANGE',number:n,policy:'NO_81_CYCLE'};
 return {status:'OK',number:n,rating:ratings[n],theme:themes[n],advice:ratingAdvice(ratings[n])};
}

export function interpretFiveGrid(fiveGrid){
 if(!fiveGrid||fiveGrid.status!=='OK')return {status:'DATA_VERIFY'};
 const entries=[];
 for(const key of ['heaven','person','earth','outer','total']){
   const n=fiveGrid[key],num=numerology81(n);
   if(num.status!=='OK')return {status:num.status,field:key,number:n,policy:num.policy||null};
   entries.push({key,label:role[key].label,number:n,rating:num.rating,theme:num.theme,role:role[key].summary,advice:num.advice});
 }
 return {status:'OK',entries,policy:'TRADITIONAL_81_NUMEROLOGY_NO_CYCLE_OVER_81',disclaimer:'81数理は伝統的な姓名判断上の解釈であり、科学的な性格判定や将来予測ではありません。'};
}

export const NAME_NUMEROLOGY81_VERSION='RC86-1';
