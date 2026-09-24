export function analyzeYinYang({family=[],given=[]}={}){
 const chars=[...family.map(x=>({...x,part:'姓'})),...given.map(x=>({...x,part:'名'}))];
 if(!chars.length||chars.some(x=>!Number.isInteger(Number(x.stroke))||Number(x.stroke)<=0))return {status:'DATA_VERIFY'};
 const sequence=chars.map(x=>Number(x.stroke)%2===0?'陰':'陽');
 const transitions=sequence.slice(1).reduce((n,x,i)=>n+(x!==sequence[i]?1:0),0);
 const yin=sequence.filter(x=>x==='陰').length, yang=sequence.length-yin;
 const allSame=yin===0||yang===0;
 const balance=allSame?'偏りあり':Math.abs(yin-yang)<=1?'均衡':'やや偏り';
 return {status:'OK',characters:chars.map((x,i)=>({character:x.char,stroke:Number(x.stroke),part:x.part,yinYang:sequence[i]})),sequence,display:sequence.join('・'),yinCount:yin,yangCount:yang,transitions,balance,policy:'REAL_CHARACTERS_ODD_YANG_EVEN_YIN_V1',note:'陰陽配列では実際の文字だけを奇数=陽・偶数=陰として並べ、五格計算用の仮数1は配列へ加えません。',disclaimer:'陰陽配列は流派差のある補助的な見方です。'};
}
export const NAME_YINYANG_VERSION='RC230-1';
