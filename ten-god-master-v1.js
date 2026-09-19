(() => {"use strict";
const META=Object.freeze({
"甲":["木","+"] ,"乙":["木","-"],"丙":["火","+"],"丁":["火","-"],"戊":["土","+"],"己":["土","-"],"庚":["金","+"],"辛":["金","-"],"壬":["水","+"],"癸":["水","-"]
});
const GEN=Object.freeze({"木":"火","火":"土","土":"金","金":"水","水":"木"}),CTRL=Object.freeze({"木":"土","土":"水","水":"火","火":"金","金":"木"});
function tenGod(day,target){const d=META[day],t=META[target];if(!d||!t)return {status:"INVALID_STEM"};let family;
 if(d[0]===t[0])family="peer";else if(GEN[d[0]]===t[0])family="output";else if(CTRL[d[0]]===t[0])family="wealth";
 else if(CTRL[t[0]]===d[0])family="officer";else if(GEN[t[0]]===d[0])family="resource";else return {status:"UNRESOLVED"};
 const same=d[1]===t[1],names={peer:same?"比肩":"劫財",output:same?"食神":"傷官",wealth:same?"偏財":"正財",officer:same?"偏官":"正官",resource:same?"偏印":"印綬"};
 return {status:"OK_RELATION",dayMaster:day,target,family,polaritySame:same,name:names[family]};
}
window.TenGodMaster={version:"TEN_GOD_RELATION_V1",meta:META,tenGod};
})();