const ELEMENTS=Object.freeze({1:'木',2:'木',3:'火',4:'火',5:'土',6:'土',7:'金',8:'金',9:'水',0:'水'});
const GENERATES=Object.freeze({木:'火',火:'土',土:'金',金:'水',水:'木'});
const CONTROLS=Object.freeze({木:'土',土:'水',水:'火',火:'金',金:'木'});

export function fiveElementForGrid(number){
 const n=Number(number); if(!Number.isInteger(n)||n<1)return null; return ELEMENTS[n%10]||null;
}
export function elementRelation(a,b){
 if(!a||!b)return 'UNKNOWN';
 if(a===b)return '比和';
 if(GENERATES[a]===b||GENERATES[b]===a)return '相生';
 if(CONTROLS[a]===b||CONTROLS[b]===a)return '相剋';
 return 'UNKNOWN';
}
function relationNote(r){
 if(r==='相生')return '互いを生かす関係として読みます。';
 if(r==='比和')return '同じ五行が重なる関係として読みます。';
 if(r==='相剋')return '五行がぶつかる関係として注意点を読みます。';
 return '関係を判定できません。';
}
export function analyzeSansai(fiveGrid){
 if(!fiveGrid||fiveGrid.status!=='OK')return {status:'DATA_VERIFY'};
 const heaven=fiveElementForGrid(fiveGrid.heaven),person=fiveElementForGrid(fiveGrid.person),earth=fiveElementForGrid(fiveGrid.earth);
 if(!heaven||!person||!earth)return {status:'DATA_VERIFY'};
 const success=elementRelation(heaven,person),foundation=elementRelation(person,earth);
 const clashCount=[success,foundation].filter(x=>x==='相剋').length;
 const harmonyCount=[success,foundation].filter(x=>x==='相生').length;
 const balance=clashCount? '要注意' : harmonyCount===2 ? '調和' : harmonyCount===1 ? '比較的調和' : '比和中心';
 return {status:'OK',elements:{heaven,person,earth},pattern:`${heaven}${person}${earth}`,success:{relation:success,label:'成功運',note:relationNote(success)},foundation:{relation:foundation,label:'基礎運',note:relationNote(foundation)},balance,policy:'LAST_DIGIT_FIVE_ELEMENTS_V1',disclaimer:'三才配置は伝統的な姓名判断の補助的な見方です。流派により評価方法が異なります。'};
}
export const NAME_SANSAI_VERSION='RC230-1';
