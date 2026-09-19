(() => {"use strict";
const BAD=[/寿命.{0,8}(短|長|わか)/,/必ず.{0,12}(起こ|なる|成功|失敗)/,/絶対.{0,12}(起こ|なる|成功|失敗)/,/病気.{0,8}(なる|わかる|確定)/];
function validate(text){const s=String(text||"");const hits=BAD.filter(r=>r.test(s)).map(r=>r.source);return {ok:!hits.length,hits}}
function safe(text,fallback="複数の情報を照合し、断定を避けて傾向として読み解きます。"){return validate(text).ok?String(text):fallback}
window.OutputGuardV1={version:"OUTPUT_GUARD_V1",validate,safe};
})();