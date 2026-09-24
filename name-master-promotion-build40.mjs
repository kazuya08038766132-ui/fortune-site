import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {buildStrokeCorpus} from './kanjidic2-corpus-build40.js';
import {nameMasterGate} from './name-master-gate-build40.js';
export const OFFICIAL_KANJIDIC2_URLS=new Set(['https://www.edrdg.org/kanjidic/kanjidic2.xml.gz','https://www.edrdg.org/pub/Nihongo/kanjidic2.xml.gz','https://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz']);
const GZIP_MAGIC=Buffer.from([0x1f,0x8b]);
function looksGzip(buf){return buf.length>=2&&buf[0]===GZIP_MAGIC[0]&&buf[1]===GZIP_MAGIC[1]}
function validateKanjidic2Header(xml){
 const headers=[...String(xml).matchAll(/<header>([\s\S]*?)<\/header>/g)];
 if(headers.length===0) throw new Error('NAME_SOURCE_HEADER_INVALID');
 if(headers.length!==1) throw new Error('NAME_SOURCE_HEADER_CARDINALITY_INVALID');
 const header=headers[0][1];
 const one=(tag)=>{
  const matches=[...header.matchAll(new RegExp(`<${tag}>([^<]+)<\\/${tag}>`,'g'))].map(m=>m[1].trim());
  if(matches.length!==1||!matches[0]) throw new Error('NAME_SOURCE_HEADER_FIELD_CARDINALITY_INVALID:'+tag);
  return matches[0];
 };
 const fileVersion=one('file_version');
 const databaseVersion=one('database_version');
 const creationDate=one('date_of_creation');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(creationDate)||Number.isNaN(Date.parse(creationDate+'T00:00:00Z'))) throw new Error('NAME_SOURCE_HEADER_DATE_INVALID');
 return {fileVersion,databaseVersion,creationDate};
}
const h=b=>crypto.createHash('sha256').update(b).digest('hex');
export function buildNamePromotion({sourcePath,sourceUrl,asOf=new Date().toISOString().slice(0,10)}){
 if(!OFFICIAL_KANJIDIC2_URLS.has(sourceUrl)) throw new Error('NAME_SOURCE_NOT_OFFICIAL_ALLOWLIST');
 if(!sourcePath||!fs.existsSync(sourcePath)) throw new Error('NAME_SOURCE_ARTIFACT_REQUIRED');
 const raw=fs.readFileSync(sourcePath); const shouldBeGzip=sourceUrl.endsWith('.gz');
 if(shouldBeGzip&&!looksGzip(raw)) throw new Error('NAME_SOURCE_GZIP_SIGNATURE_INVALID');
 let xmlBuf; try{xmlBuf=shouldBeGzip?gunzipSync(raw):raw}catch{throw new Error('NAME_SOURCE_GZIP_INVALID')}
 const xml=xmlBuf.toString('utf8'); if(!xml.includes('<kanjidic2')||!xml.includes('<character>')) throw new Error('NAME_SOURCE_XML_INVALID');
 const header=validateKanjidic2Header(xml);
 const corpus=buildStrokeCorpus(xml,{sourceUrl}); const gate=nameMasterGate(corpus,{asOf});
 if(!gate.ready) throw new Error('NAME_MASTER_GATE_FAILED:'+JSON.stringify(gate));
 const corpusText=JSON.stringify(corpus,null,2)+'\n';
 return {corpus,corpusText,receipt:{schema:'name-corpus-receipt/v2',officialSourceUrl:sourceUrl,downloadSha256:h(raw),sourceXmlSha256:h(xmlBuf),importedRecordCount:corpus.stats.characters,importSha256:h(Buffer.from(corpusText)),sourceDate:corpus.meta.sourceDate,sourceFileVersion:header.fileVersion,sourceDatabaseVersion:header.databaseVersion,acceptedAt:new Date().toISOString()}};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const [sourcePath,sourceUrl,corpusOut='name-stroke-corpus-build40.json',receiptOut='NAME_CORPUS_RECEIPT_BUILD40.json']=process.argv.slice(2);
 try{const r=buildNamePromotion({sourcePath,sourceUrl}); if(fs.existsSync(corpusOut)||fs.existsSync(receiptOut))throw new Error('NAME_PROMOTION_TARGET_EXISTS'); const tc=`${corpusOut}.tmp-${process.pid}`,tr=`${receiptOut}.tmp-${process.pid}`; try{fs.writeFileSync(tc,r.corpusText,{flag:'wx'});fs.writeFileSync(tr,JSON.stringify(r.receipt,null,2)+'\n',{flag:'wx'});fs.renameSync(tc,corpusOut);fs.renameSync(tr,receiptOut);}catch(w){for(const f of [tc,tr]){try{fs.rmSync(f,{force:true})}catch{}};try{if(fs.existsSync(corpusOut)&&!fs.existsSync(receiptOut))fs.rmSync(corpusOut)}catch{};throw w;} console.log(JSON.stringify({ok:true,records:r.receipt.importedRecordCount,receiptOut,corpusOut}));}catch(e){console.error(JSON.stringify({ok:false,error:String(e.message||e)}));process.exitCode=2}
}
