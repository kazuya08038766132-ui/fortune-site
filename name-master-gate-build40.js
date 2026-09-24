export function nameMasterGate(corpus,{minCharacters=12000,asOf=new Date().toISOString().slice(0,10),maxSourceAgeDays=31}={}){
 const s=corpus?.stats||{},m=corpus?.meta||{};
 const provenance=typeof m.sha256==="string"&&/^[a-f0-9]{64}$/.test(m.sha256)&&m.source==="KANJIDIC2"&&m.license==="CC BY-SA 4.0";
 const coverage=Number(s.characters)>=minCharacters&&Number(s.verified)>0;
 const accounting=Number(s.characters)===Number(s.verified||0)+Number(s.ambiguous||0)+Number(s.missing||0);
 const sourceDateOk=/^\d{4}-\d{2}-\d{2}$/.test(String(m.sourceDate||""));
 let sourceAgeDays=null; if(sourceDateOk){sourceAgeDays=Math.floor((Date.parse(asOf+"T00:00:00Z")-Date.parse(m.sourceDate+"T00:00:00Z"))/86400000);}
 const freshness=sourceDateOk&&Number.isFinite(sourceAgeDays)&&sourceAgeDays>=0&&sourceAgeDays<=maxSourceAgeDays;
 const canonicalSource=/^https:\/\/(?:ftp\.)?edrdg\.org\/(?:pub\/Nihongo|kanjidic)\/kanjidic2\.xml(?:\.gz)?$/.test(String(m.sourceUrl||""));
 return {ready:provenance&&coverage&&accounting&&freshness&&canonicalSource,provenance,coverage,accounting,freshness,canonicalSource,sourceAgeDays,stats:s,minCharacters,maxSourceAgeDays};
}
