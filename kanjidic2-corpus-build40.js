import fs from "fs";
import crypto from "crypto";

export function buildStrokeCorpus(xml,{sourceVersion=null,sourceUrl="EDRDG KANJIDIC2"}={}){
 const creationDate=String(xml).match(/<date_of_creation>([^<]+)<\/date_of_creation>/)?.[1]||null;
 const databaseVersion=String(xml).match(/<database_version>([^<]+)<\/database_version>/)?.[1]||null;
 const text=String(xml);
 if(/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("KANJIDIC2_XML_DTD_OR_ENTITY_FORBIDDEN");
 const rootCount=(text.match(/<kanjidic2(?:\s|>)/g)||[]).length;
 if(rootCount!==1||!/<\/kanjidic2>\s*$/.test(text)) throw new Error("KANJIDIC2_XML_ROOT_INVALID");
 const parsed=[],seen=new Set();
 const characterBlocks=[...text.matchAll(/<character>([\s\S]*?)<\/character>/g)];
 if(characterBlocks.length===0) throw new Error("KANJIDIC2_CHARACTER_BLOCKS_MISSING");
 for(const m of characterBlocks){
  const block=m[1];
  const literals=[...block.matchAll(/<literal>([^<]+)<\/literal>/g)].map(x=>x[1]);
  if(literals.length!==1) throw new Error("KANJIDIC2_LITERAL_CARDINALITY_INVALID");
  const literal=literals[0];
  if([...literal].length!==1||!/^\p{Script=Han}$/u.test(literal)) throw new Error("KANJIDIC2_LITERAL_NOT_SINGLE_HAN:"+literal);
  if(seen.has(literal)) throw new Error("KANJIDIC2_DUPLICATE_LITERAL:"+literal);
  seen.add(literal);
  // EDRDG KANJIDIC2: first stroke_count is the accepted count; later values are common miscounts.
  // Fail closed on malformed/out-of-range values instead of silently filtering them.
  const strokeTags=[...block.matchAll(/<stroke_count>([\s\S]*?)<\/stroke_count>/g)].map(x=>x[1]);
  const strokeCounts=[];
  for(const raw of strokeTags){
   if(!/^\d+$/.test(raw)) throw new Error("KANJIDIC2_STROKE_COUNT_FORMAT_INVALID:"+literal);
   const n=Number(raw);
   if(!Number.isSafeInteger(n)||n<1||n>64) throw new Error("KANJIDIC2_STROKE_COUNT_RANGE_INVALID:"+literal);
   strokeCounts.push(n);
  }
  parsed.push({literal,strokeCounts});
 }
 parsed.sort((a,b)=>a.literal.codePointAt(0)-b.literal.codePointAt(0));
 const records=[],stats={characters:0,verified:0,ambiguous:0,missing:0,alternateRecorded:0};
 for(const x of parsed){
  const counts=[...new Set(x.strokeCounts||[])];
  let status="DATA_VERIFY",strokeCount=null,alternateStrokeCounts=[];
  if(counts.length){
   status="VERIFIED";strokeCount=counts[0];alternateStrokeCounts=counts.slice(1);stats.verified++;
   if(alternateStrokeCounts.length)stats.alternateRecorded++;
  }else stats.missing++;
  records.push({literal:x.literal,strokeCount,strokeCounts:counts,alternateStrokeCounts,status,strokeCountSemantics:"KANJIDIC2_FIRST_ACCEPTED"});
 }
 stats.characters=records.length;
 return {
  meta:{source:"KANJIDIC2",publisher:"Electronic Dictionary Research and Development Group",license:"CC BY-SA 4.0",
    sourceVersion:sourceVersion||databaseVersion,sourceDate:creationDate,sourceUrl,sha256:crypto.createHash("sha256").update(xml).digest("hex"),generatedAt:new Date().toISOString(),
    strokeCountSemantics:"first stroke_count = accepted count; subsequent values retained as common miscounts"},
  stats,records
 };
}
export function writeStrokeCorpus(inputXml,outputJson,opts={}){
 const xml=fs.readFileSync(inputXml,"utf8"),corpus=buildStrokeCorpus(xml,opts);
 fs.writeFileSync(outputJson,JSON.stringify(corpus,null,2)+"\n");return corpus;
}
