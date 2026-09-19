(() => {"use strict";
const CONTRACT=Object.freeze({
version:"PRIVACY_RETENTION_V1",
palm:{purpose:"手相鑑定の解析",trainingDefault:false,trainingRequiresSeparateOptIn:true,tempHours:24,originalRetentionDays:30},
principles:["鑑定目的以外に無断利用しない","AI学習は初期OFF","学習利用は別同意","保持期限後の削除対象を追跡する"]
});
window.FortunePrivacyContract=CONTRACT;
})();