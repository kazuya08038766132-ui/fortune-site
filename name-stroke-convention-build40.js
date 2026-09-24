export const NAME_STROKE_CONVENTION=Object.freeze({
 id:"modern-japanese-glyph-v2-kanjidic2-canonical",
 displayName:"現代日本字形・通常画数方式",
 baseDataset:"KANJIDIC2",
 policy:[
  "入力された現代表記の文字をそのまま評価する",
  "旧字体へ自動変換しない",
  "異体字へ自動変換しない",
  "KANJIDIC2の先頭stroke_countを採用画数として使用する",
  "後続stroke_countは一般的な誤画数として監査用に保持し、自動採用しない",
  "未登録文字はDATA_VERIFY",
  "一字姓・一字名の仮数は既存仕様どおり1"
 ],
 disclosure:"姓名判断には複数の画数流派があります。本サイトは現代表記とKANJIDIC2の採用画数を基準にした通常画数方式を採用し、旧字体・異体字への自動変換は行いません。"
});
export function chooseStrokeCount(record){
 const explicit=Number(record?.strokeCount);
 if(Number.isInteger(explicit)&&explicit>0)return {status:"OK",stroke:explicit,sourceSemantics:record?.strokeCountSemantics||"EXPLICIT_CANONICAL"};
 const xs=[...new Set((record?.strokeCounts||[]).map(Number).filter(n=>Number.isInteger(n)&&n>0))];
 if(xs.length)return {status:"OK",stroke:xs[0],alternateStrokeCounts:xs.slice(1),sourceSemantics:"KANJIDIC2_FIRST_ACCEPTED"};
 return {status:"DATA_VERIFY"};
}
