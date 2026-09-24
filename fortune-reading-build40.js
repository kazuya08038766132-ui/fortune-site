const STEMS=["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES=["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const ELEMENT={甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"};
const YINYANG={甲:"陽",乙:"陰",丙:"陽",丁:"陰",戊:"陽",己:"陰",庚:"陽",辛:"陰",壬:"陽",癸:"陰"};
export function sexagenaryYear(year){const y=Number(year);const si=((y-4)%10+10)%10,bi=((y-4)%12+12)%12;return {stem:STEMS[si],branch:BRANCHES[bi],label:STEMS[si]+BRANCHES[bi],element:ELEMENT[STEMS[si]],yinYang:YINYANG[STEMS[si]],stemIndex:si};}
export function sexagenaryMonth(pillarYear,monthNo){const yr=sexagenaryYear(pillarYear),m=Number(monthNo);if(!Number.isInteger(m)||m<1||m>12)return null;const firstStemByYearStem=[2,4,6,8,0,2,4,6,8,0];const stemIndex=(firstStemByYearStem[yr.stemIndex]+m-1)%10;const branchIndex=(2+m-1)%12;return {stem:STEMS[stemIndex],branch:BRANCHES[branchIndex],label:STEMS[stemIndex]+BRANCHES[branchIndex],element:ELEMENT[STEMS[stemIndex]],yinYang:YINYANG[STEMS[stemIndex]],monthNo:m};}
const COPY={木:"伸びる力・柔軟性・発展を象徴します。",火:"表現・行動・熱量を象徴します。",土:"安定・受容・基盤を象徴します。",金:"整理・判断・洗練を象徴します。",水:"思考・流動性・洞察を象徴します。"};
export function composeFreeBirthCards({yearPillar,monthPillar,boundary}){const same=yearPillar.element===monthPillar.element;return [
 {title:"年柱",value:yearPillar.label,text:`${yearPillar.yinYang}${yearPillar.element}の気を持つ年。${COPY[yearPillar.element]}`},
 {title:"月柱",value:monthPillar.label,text:`節月では第${monthPillar.monthNo}月。${monthPillar.yinYang}${monthPillar.element}の性質を基調として読みます。`},
 {title:"年の五行",value:yearPillar.element,text:COPY[yearPillar.element]},
 {title:"月の五行",value:monthPillar.element,text:COPY[monthPillar.element]},
 {title:"陰陽バランス",value:`${yearPillar.yinYang} × ${monthPillar.yinYang}`,text:yearPillar.yinYang===monthPillar.yinYang?"同じ陰陽が重なる配置です。":"陰陽が一つずつ現れる配置です。"},
 {title:"五行の重なり",value:same?"同気":"異気",text:same?"年と月で同じ五行が重なります。":"年と月で異なる五行が組み合わさります。"},
 {title:"節入り確認",value:boundary.status==="OK"?"確定":"要確認",text:boundary.status==="OK"?`${boundary.boundary.term}以後の節月として判定。`:"節入り当日は出生時刻なしでは月境界を断定しません。"}
];}

const REL={same:"同じ五行",different:"異なる五行"};
export function composePremiumBirthCards({yearPillar,monthPillar,dayPillar,monthBoundary}){
 const elems=[yearPillar.element,monthPillar.element,dayPillar.element],yy=[yearPillar.yinYang,monthPillar.yinYang,dayPillar.yinYang];
 const counts=Object.fromEntries(["木","火","土","金","水"].map(e=>[e,elems.filter(x=>x===e).length]));
 const active=Object.entries(counts).filter(([,n])=>n>0).map(([e,n])=>`${e}${n}`).join("・");
 return [
  {title:"年柱",value:yearPillar.label,text:`生まれた年の柱。${yearPillar.yinYang}${yearPillar.element}として読みます。`},
  {title:"月柱",value:monthPillar.label,text:`節入り基準の第${monthPillar.monthNo}月。${monthPillar.yinYang}${monthPillar.element}として読みます。`},
  {title:"日柱",value:dayPillar.label,text:`生年月日の暦日から算出した日干支です。日付単位で判定します。`},
  {title:"日主",value:dayPillar.dayMaster,text:`日柱の天干 ${dayPillar.dayMaster} を日主として扱います。`},
  {title:"日主の五行",value:dayPillar.element,text:COPY[dayPillar.element]},
  {title:"日主の陰陽",value:dayPillar.yinYang,text:`${dayPillar.dayMaster}は${dayPillar.yinYang}の天干です。`},
  {title:"三柱の五行",value:active,text:"年・月・日の天干五行を並べた構成です。時柱は出生時刻を入力しない仕様のため含めません。"},
  {title:"三柱の陰陽",value:yy.join("・"),text:`陽${yy.filter(x=>x==="陽").length} / 陰${yy.filter(x=>x==="陰").length} の構成です。`},
  {title:"年柱と日主",value:yearPillar.element===dayPillar.element?REL.same:REL.different,text:`年の天干五行は${yearPillar.element}、日主は${dayPillar.element}です。`},
  {title:"月柱と日主",value:monthPillar.element===dayPillar.element?REL.same:REL.different,text:`月の天干五行は${monthPillar.element}、日主は${dayPillar.element}です。`},
  {title:"判定基準",value:monthBoundary.status==="OK"?"節入り確認済み":"要確認",text:"年柱・月柱は検証済み節入りデータ、日柱はグレゴリオ暦日の60干支循環で算出。時柱は省略しています。"}
 ];
}
