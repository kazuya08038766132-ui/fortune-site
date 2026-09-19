(() => {"use strict";
function apply(){
 const dev=!!window.FORTUNE_CONFIG?.devMode;
 document.documentElement.dataset.fortuneDev=dev?"1":"0";
 for(const el of document.querySelectorAll(".devOnly,#devDashboard,#devPalmPanel,#devPalmPreview,[data-dev-only]")) el.style.display=dev?"":"none";
 const launcher=document.getElementById("devLauncher");if(launcher)launcher.style.display=dev?"":"none";
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
window.applyFortuneReleaseMode=apply;
})();