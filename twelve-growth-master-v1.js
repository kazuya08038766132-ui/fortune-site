(() => {"use strict";
const ORDER=[..."長沐冠臨帝衰病死墓絶胎養"]; // internal keys expanded below
const N=["長生","沐浴","冠帯","臨官","帝旺","衰","病","死","墓","絶","胎","養"];
const B=[..."子丑寅卯辰巳午未申酉戌亥"];
const START={"甲":"亥","乙":"午","丙":"寅","丁":"酉","戊":"寅","己":"酉","庚":"巳","辛":"子","壬":"申","癸":"卯"};
const YANG=new Set(["甲","丙","戊","庚","壬"]);
function phase(stem,branch){if(!START[stem]||!B.includes(branch))return {status:"INVALID_INPUT"};const si=B.indexOf(START[stem]),bi=B.indexOf(branch),step=YANG.has(stem)?(bi-si+12)%12:(si-bi+12)%12;return {status:"OK_TABLE",stem,branch,phase:N[step],index:step,note:"十二運の対応表。単独で吉凶・健康・寿命を断定しません。"}}
window.TwelveGrowthMaster={version:"TWELVE_GROWTH_TABLE_V1",phase};
})();