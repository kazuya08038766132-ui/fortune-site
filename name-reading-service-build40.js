import {resolveNameStrokes} from './name-engine-adapter-build40.js';
import {calculateFiveGrid} from './five-grid-build40.js';
import {interpretFiveGrid} from './name-numerology81-build40.js';
import {analyzeSansai} from './name-sansai-build40.js';
import {analyzeYinYang} from './name-yinyang-build40.js';
import {interpretSansai125} from './name-sansai125-build40.js';
import {synthesizeNameReading} from './name-comprehensive-reading-build40.js';

export function masterFromCorpus(corpus){
  const out={};
  for(const r of corpus?.records||[]){
    if(r?.status==='VERIFIED' && Number.isInteger(r.strokeCount) && r.strokeCount>0){
      out[r.literal]={strokeCount:r.strokeCount,strokeCounts:r.strokeCounts||[r.strokeCount],alternateStrokeCounts:r.alternateStrokeCounts||[],strokeCountSemantics:r.strokeCountSemantics||'KANJIDIC2_FIRST_ACCEPTED'};
    }
  }
  return out;
}

export function buildNameReading({familyName,givenName,master}){
  const family=String(familyName||'').trim(),given=String(givenName||'').trim();
  if(!family||!given)return {status:'INVALID_NAME'};
  const fr=resolveNameStrokes(family,master||{}),gr=resolveNameStrokes(given,master||{});
  if(fr.status!=='OK'||gr.status!=='OK'){
    return {status:'DATA_VERIFY',familyIssues:fr.issues||[],givenIssues:gr.issues||[]};
  }
  const familyStrokes=fr.values.map(x=>x.stroke),givenStrokes=gr.values.map(x=>x.stroke);
  const fiveGrid=calculateFiveGrid({familyStrokes,givenStrokes});
  if(fiveGrid.status!=='OK')return {status:'DATA_VERIFY'};
  const numerology=interpretFiveGrid(fiveGrid);
  const sansai=analyzeSansai(fiveGrid);
  const yinYang=analyzeYinYang({family:fr.values,given:gr.values});
  const sansai125=interpretSansai125(fiveGrid);
  const comprehensive=synthesizeNameReading({numerology,sansai125,yinYang});
  if(numerology.status!=='OK')return {status:numerology.status==='OUT_OF_RANGE'?'NUMEROLOGY_OUT_OF_RANGE':'DATA_VERIFY',fiveGrid,numerology};
  return {
    status:'OK',familyName:family,givenName:given,
    family:fr.values,given:gr.values,fiveGrid,numerology,sansai,sansai125,yinYang,comprehensive,
    calculationDisclosure:{spiritualNumberPolicy:'一字姓は天格、一字名は地格、外格の計算に仮数1を使用。人格・総格には加算しません。',yinYangPolicy:'陰陽配列は実字のみを使用し、仮数1は含めません。',schoolDifference:'画数・霊数・三才・陰陽の評価方法には流派差があります。'},
    calculationEvidence:{characters:[...fr.values.map(x=>({...x,part:'姓'})),...gr.values.map(x=>({...x,part:'名'}))],formula:{heaven:`姓の画数合計${familyStrokes.reduce((a,b)=>a+b,0)}${familyStrokes.length===1?'＋仮数1':''}`,person:`姓末尾${familyStrokes.at(-1)}＋名先頭${givenStrokes[0]}`,earth:`名の画数合計${givenStrokes.reduce((a,b)=>a+b,0)}${givenStrokes.length===1?'＋仮数1':''}`,outer:`総格${fiveGrid.total}－人格${fiveGrid.person}${familyStrokes.length===1?'＋姓仮数1':''}${givenStrokes.length===1?'＋名仮数1':''}`,total:`実字の画数合計${fiveGrid.total}`},fiveGrid:{heaven:fiveGrid.heaven,person:fiveGrid.person,earth:fiveGrid.earth,outer:fiveGrid.outer,total:fiveGrid.total}},
    convention:'modern-japanese-glyph-v2-kanjidic2-canonical'
  };
}
