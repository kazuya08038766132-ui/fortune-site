(() => {"use strict";
function load(){
 if(!window.FORTUNE_CONFIG?.devMode)return;
 if(document.querySelector('script[data-legacy-palm]'))return;
 const s=document.createElement("script");s.src="/legacy-dev-palm-engine-v1.js?v=SPEC195-BUILD-30";s.defer=true;s.dataset.legacyPalm="1";
 document.head.appendChild(s);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});else load();
})();