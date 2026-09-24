const STEMS=["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES=["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const ELEMENT={甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"};
const YINYANG={甲:"陽",乙:"陰",丙:"陽",丁:"陰",戊:"陽",己:"陰",庚:"陽",辛:"陰",壬:"陽",癸:"陰"};

function parseIsoDate(value){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
 if(!m)return null;
 const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
 if(y<1582||mo<1||mo>12||d<1||d>31)return null;
 const dt=new Date(Date.UTC(y,mo-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return null;
 return {y,mo,d};
}

export function gregorianJdn(date){
 const p=parseIsoDate(date);if(!p)return null;
 const a=Math.floor((14-p.mo)/12), y=p.y+4800-a, m=p.mo+12*a-3;
 return p.d+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;
}

export function sexagenaryDay(date){
 const jdn=gregorianJdn(date);if(jdn===null)return {status:"INVALID_DATE"};
 // NAOJ's mechanically assigned daily sexagenary cycle matches (JDN + 49) mod 60.
 const index=((jdn+49)%60+60)%60, stemIndex=index%10, branchIndex=index%12;
 const stem=STEMS[stemIndex],branch=BRANCHES[branchIndex];
 return {status:"OK",date,jdn,index,stem,branch,label:stem+branch,dayMaster:stem,element:ELEMENT[stem],yinYang:YINYANG[stem],convention:"CIVIL_DATE_JST_DATE_ONLY"};
}
