(() => {"use strict";
function normalizeRecord(r){
 if(!r||typeof r.char!=="string"||[...r.char].length!==1)return {status:"INVALID"};
 const n=Number(r.strokes);
 if(!Number.isInteger(n)||n<1||n>99)return {status:"INVALID"};
 if(!["JAPANESE_NEW_FORM_VERIFIED","MANUAL_AUDIT"].includes(r.evidence))return {status:"DATA_VERIFY"};
 return {status:"VERIFIED",char:r.char,strokes:n,evidence:r.evidence,source:r.source||null,sourceVersion:r.sourceVersion||null};
}
function build(records=[]){const map={},rejected=[];for(const r of records){const x=normalizeRecord(r);if(x.status==="VERIFIED")map[x.char]=x;else rejected.push({char:r?.char||null,status:x.status})}
 return {version:"NAME_STROKE_INGEST_V1",standard:"NEW_FORM_CURRENT_GLYPH",map,rejected,count:Object.keys(map).length,
 guard:"Generic Unihan kTotalStrokes alone is not accepted as Japanese姓名判断の新字体画数根拠。日本字形に対応する検証済み根拠を要求します。"}}
window.NameStrokeIngestV1={version:"NAME_STROKE_INGEST_V1",normalizeRecord,build};
})();