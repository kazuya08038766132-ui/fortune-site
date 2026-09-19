(() => {"use strict";
const qs=new URLSearchParams(location.search);
const explicit=qs.get("dev")==="1";
const host=location.hostname;
const local=host==="localhost"||host==="127.0.0.1";
window.FORTUNE_CONFIG=Object.freeze({
 build:"SPEC195-BUILD-30",
 spec:"SPEC_V1_195_FREEZE",
 devMode: explicit||local,
 prices:Object.freeze({detail:980,membership:490}),
 publicBirthLabel:"生年月日占い",
 paidBirthLabel:"生年月日から見る運命・命式データ"
});
window.FORTUNE_DEV_PREVIEW=window.FORTUNE_CONFIG.devMode;
})();