(() => {"use strict";
const E=["木","火","土","金","水"],GEN={"木":"火","火":"土","土":"金","金":"水","水":"木"},CTRL={"木":"土","土":"水","水":"火","火":"金","金":"木"};
function rel(a,b){if(a===b)return "SAME";if(GEN[a]===b)return "GENERATES";if(GEN[b]===a)return "GENERATED_BY";if(CTRL[a]===b)return "CONTROLS";if(CTRL[b]===a)return "CONTROLLED_BY";return "UNKNOWN"}
const M={};for(const t of E)for(const j of E)for(const c of E){const key=t+j+c;M[key]=Object.freeze({key,ten:t,jin:j,chi:c,tenToJin:rel(t,j),jinToChi:rel(j,c),center:j,traditionalTextStatus:"UNVERIFIED"});}
function lookup(t,j,c){const x=M[String(t)+String(j)+String(c)];return x?{status:"OK_STRUCTURAL",...x,guard:"健康・寿命を断定しません。125通り固有の伝統解釈文は検証済みMasterが入るまで生成しません。"}:{status:"INVALID_ELEMENT"}}
window.Sansai125MasterV1={version:"SANSAI_125_STRUCTURAL_V1",elements:E,relations:["SAME","GENERATES","GENERATED_BY","CONTROLS","CONTROLLED_BY"],count:Object.keys(M).length,lookup};
})();