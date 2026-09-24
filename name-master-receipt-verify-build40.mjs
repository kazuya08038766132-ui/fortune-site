import fs from 'node:fs';
import crypto from 'node:crypto';
import {OFFICIAL_KANJIDIC2_URLS} from './name-master-promotion-build40.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const HEX=/^[a-f0-9]{64}$/;
export function verifyNameMasterReceipt({corpusPath='name-stroke-corpus-build40.json',receiptPath='NAME_CORPUS_RECEIPT_BUILD40.json'}={}){
 const errors=[];
 if(!fs.existsSync(corpusPath)) errors.push('CORPUS_MISSING');
 if(!fs.existsSync(receiptPath)) errors.push('RECEIPT_MISSING');
 if(errors.length) return {ok:false,errors};
 let corpus,receipt,corpusBytes;
 try{corpusBytes=fs.readFileSync(corpusPath);corpus=JSON.parse(corpusBytes);receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));}catch{ return {ok:false,errors:['JSON_INVALID']}; }
 if(receipt.schema!=='name-corpus-receipt/v2') errors.push('RECEIPT_SCHEMA');
 for(const k of ['downloadSha256','sourceXmlSha256','importSha256']) if(!HEX.test(String(receipt[k]||''))) errors.push(`RECEIPT_HASH_${k}`);
 if(!OFFICIAL_KANJIDIC2_URLS.has(String(receipt.officialSourceUrl||''))) errors.push('SOURCE_URL_NOT_OFFICIAL_ALLOWLIST');
 if(sha(corpusBytes)!==receipt.importSha256) errors.push('CORPUS_HASH_MISMATCH');
 if(Number(corpus?.stats?.characters)!==Number(receipt.importedRecordCount)) errors.push('RECORD_COUNT_MISMATCH');
 if(String(corpus?.meta?.sourceUrl||'')!==String(receipt.officialSourceUrl||'')) errors.push('SOURCE_BINDING_MISMATCH');
 if(String(corpus?.meta?.sourceDate||'')!==String(receipt.sourceDate||'')) errors.push('SOURCE_DATE_MISMATCH');
 if(!/^\d{4}-\d{2}-\d{2}T/.test(String(receipt.acceptedAt||''))) errors.push('ACCEPTED_AT');
 return {ok:errors.length===0,errors,corpusSha256:sha(corpusBytes),records:Number(corpus?.stats?.characters||0)};
}
if(import.meta.url===`file://${process.argv[1]}`){const r=verifyNameMasterReceipt({corpusPath:process.argv[2],receiptPath:process.argv[3]});console.log(JSON.stringify(r,null,2));if(!r.ok)process.exitCode=2;}
