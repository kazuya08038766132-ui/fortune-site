export const PALM_UX={
  EMPTY:{kind:'warn',label:'未選択',message:'指先から手首まで、手のひら全体が入るように撮影してください。'},
  CHECKING:{kind:'warn',label:'確認中',message:'写真の明るさ・解像度・コントラストを端末内で確認しています…'},
  RECAPTURE:{kind:'bad',label:'撮り直し',message:'写真条件を整えて、もう一度撮影してください。'},
  MODEL_PENDING:{kind:'warn',label:'品質OK',message:'写真品質は良好です。現在は手相モデル準備中のため、主要線の判定は保留します。'},
  ANALYZING:{kind:'warn',label:'解析中',message:'主要線をブラウザ内で解析しています…'},
  STABILITY_CHECK:{kind:'warn',label:'安定性確認中',message:'同じ写真を内部で微小条件変更して再解析しています…'},
  READY:{kind:'ok',label:'解析完了',message:'確認できた主要線を鑑定結果へ反映しました。'},
  ERROR:{kind:'bad',label:'再試行',message:'画像を解析できませんでした。別の写真でお試しください。'}
};
export function palmUxState(key,detail=''){
 const base=PALM_UX[key]||PALM_UX.ERROR;return {...base,key,message:detail||base.message};
}
