export function calculateFiveGrid({familyStrokes,givenStrokes}){
 const f=(familyStrokes||[]).map(Number),g=(givenStrokes||[]).map(Number);
 if(!f.length||!g.length||[...f,...g].some(x=>!Number.isInteger(x)||x<=0))return {status:"DATA_VERIFY"};
 const heaven=f.reduce((a,b)=>a+b,0)+(f.length===1?1:0);
 const earth=g.reduce((a,b)=>a+b,0)+(g.length===1?1:0);
 const person=f.at(-1)+g[0];
 const total=[...f,...g].reduce((a,b)=>a+b,0);
 const outer=total-person+(f.length===1?1:0)+(g.length===1?1:0);
 return {status:"OK",heaven,person,earth,outer,total,policy:"modern-japanese-glyph-v2"};
}
