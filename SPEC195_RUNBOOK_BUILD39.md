# 総合占いサイト SPEC195 実装要領書
Version: BUILD-39 / 2026-09-20

## 固定工程
設計書確認 → GitHub現行確認 → 外部根拠確認 → 差分実装 → 静的QA → Render → 実機回帰。

## 姓名判断
- 新字体・現代表記を固定し、流派差を明記。
- 五格=天格/人格/地格/外格/総格。総合は人格を最重視し、総格・地格・外格・天格を重ねる。
- 一字姓/一字名の霊数1はNameStandardV1に従う。
- 81数理は1〜81。82以上を黙って循環しない。
- 未登録画数は推測禁止。DATA_VERIFY。
- 々は直前文字が検証済みの場合のみ同画数。
- common seedは全姓名漢字Masterではない。全字Master完成までCompletion Gate=false。
- 新字体/旧字体/熊崎式では画数が変わるため方式を混在させない。

## 生年月日
- 公開無料は生年月日のみ。出生時刻を要求しない。
- 無料は性格/才能/仕事/恋愛/金運/人間関係/注意点の7項目。
- ¥980では年柱/月柱/日柱/日主を確定できるものだけ表示。
- 年境界=立春、月境界=十二節。二十四節気は瞬間で定義されるため出生時刻なしでは節入り当日の月柱を断定しない。
- 全対象年JST節入りMaster未完成につき solarTermsExactJST=false。

## Palm
- 画像受付品質と主要線解析を分離。
- BUILD-37実写回帰で通った品質ゲートを維持。
- MediaPipe Hand Landmarkerの21ランドマークは位置/向き/ROI正規化用で、生命線等を直接返すものではない。
- principal lineはROI正規化後の別セグメンテーション工程。
- NOT_DETECTED != FEATURE_ABSENT。低信頼線を推測しない。生命線から寿命を断定しない。
- 商用モデルはdataset rights + trained model + Golden QAまでblocked。

## ¥980
11章固定: Ⅰあなたという人 / Ⅱ運命バランス / Ⅲ掌 / Ⅳ姓名 / Ⅴ生年月日 / Ⅵ仕事と才能 / Ⅶ財と金運 / Ⅷ愛情・人間関係 / Ⅸ人生の転機 / Ⅹ二つの手 / 最終章 三占術統合。
success URL単独では解放せずaccount-owned APIでPAID確認後のみ表示。

## リリース事故防止
リリース番号変更時はindex.html必須同梱。visible marker / 全script-linkの?v= / data-releaseを同じBUILD番号にする。
BUILD-38でindex.htmlを同梱せず画面がBUILD-37のままだった事故を再発させない。

## 未完了ブロッカー
出典付き全姓名漢字Master / 三才125固有伝統文 / 全対象年節入りJST Master / Palm商用principal-line model+Golden QA / Stripe test E2E / R2・Resend E2E / 法的事業者情報。
