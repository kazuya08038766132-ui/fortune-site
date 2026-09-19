(() => {"use strict";
function text(){
 const c=window.FortunePrivacyContract;
 return c?`手相写真は鑑定目的で使用します。AI学習への利用は初期OFFで、別の同意が必要です。原本の保持目安は${c.palm.originalRetentionDays}日です。`:"手相写真は鑑定目的で使用します。";
}
window.FortuneConsentCopy={text};
})();