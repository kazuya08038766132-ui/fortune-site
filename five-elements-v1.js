(() => {"use strict";
const S={甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"};
const B={寅:"木",卯:"木",辰:"土",巳:"火",午:"火",未:"土",申:"金",酉:"金",戌:"土",亥:"水",子:"水",丑:"土"};
function count(pillars=[]){const c={木:0,火:0,土:0,金:0,水:0},used=[];for(const p of pillars){if(!p||!S[p.stem]||!B[p.branch])continue;c[S[p.stem]]++;c[B[p.branch]]++;used.push(p.stem+p.branch)}
 return {status:used.length?"OK_UNWEIGHTED":"INSUFFICIENT",counts:c,used,method:"STEM_PLUS_BRANCH_BASE_UNWEIGHTED",guard:"蔵干配分・旺衰・季節補正を混ぜない単純集計です。強弱判定には使いません。"}}
window.FiveElementsV1={version:"FIVE_ELEMENTS_UNWEIGHTED_V1",count};
})();