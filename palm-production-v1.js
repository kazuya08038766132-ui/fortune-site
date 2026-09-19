(() => {"use strict";
const LINES=["LIFE","HEAD","HEART","FATE"];
function normalize(x={}){
 const o={};for(const line of LINES){const v=x[line];o[line]=v&&Number.isFinite(v.confidence)?{detected:Boolean(v.detected),confidence:Math.max(0,Math.min(1,v.confidence)),features:v.detected?(v.features||[]):[],status:v.detected?"DETECTED":"NOT_DETECTED"}:{status:"NOT_ANALYZED",features:[]}}
 return {status:"OK_NORMALIZED",lines:o,guard:"NOT_DETECTEDは特徴不存在を意味しません。生命線から寿命を判定しません。"};
}
function production(modelResult){if(!modelResult)return {status:"MODEL_UNAVAILABLE",lines:{},message:"画像品質は確認できましたが、公開用の手相線モデルは現在検証中です。線を推測して鑑定しません。"};return normalize(modelResult)}
window.PalmProductionV1={version:"PALM_PRODUCTION_CONTRACT_V1",production,normalize};
})();