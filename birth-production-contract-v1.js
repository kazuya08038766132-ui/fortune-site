(() => {"use strict";
window.BirthProductionContract=Object.freeze({
 version:"BIRTH_DATE_ONLY_CONTRACT_V1",input:["birthDate"],birthTime:false,
 publicLabel:"生年月日占い",claimFullFourPillars:false,
 exact:{dayPillar:"anchor-based date calculation"},
 guarded:{yearPillar:"立春付近は断定しない",monthPillar:"節入り付近は断定しない"},
 pending:["年別12節の正確なJST通過時刻Master","蔵干Master","旺衰Master","調候120 Master","Golden QA"]
});
})();