(() => {"use strict";
const D=Object.freeze({
"沢":7,"竜":10,"桜":10,"浜":10,"国":8,"広":5,"学":8,"辺":5,
"田":5,"山":3,"川":3,"中":4,"大":3,"本":5,"一":1,"生":5,"翔":12,"藤":18,"郎":9
});
function lookup(c){return Number.isInteger(D[c])?{char:c,strokes:D[c],standard:"NEW_FORM",source:"NEW_FORM_AUDITED_SEED_V1"}:null}
function split(full){const p=String(full||"").trim().split(/\s+/);if(p.length!==2)return {status:"NEEDS_SEPARATOR"};const chars=[...p[0],...p[1]],u=chars.filter(c=>!lookup(c));if(u.length)return {status:"DATA_VERIFY",unknown:[...new Set(u)]};return {status:"OK",surname:[...p[0]].map(c=>D[c]),given:[...p[1]].map(c=>D[c]),evidence:chars.map(lookup)}}
window.NameNewFormMaster={version:"NEW_FORM_AUDITED_SEED_V1",lookup,split};
})();