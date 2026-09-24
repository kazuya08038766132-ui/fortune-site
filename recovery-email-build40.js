export function recoveryEmail({baseUrl,token}){
 const u=new URL("/recover.html",baseUrl);
 u.hash=`recovery_token=${encodeURIComponent(token)}`;
 if(process.env.NODE_ENV==="production"&&u.protocol!=="https:")throw Error("recovery link must use HTTPS");
 return {subject:"購入履歴の確認リンク",
  html:`<p>購入履歴を別の端末で確認するためのリンクです。</p><p><a href="${u.href}">購入履歴を確認する</a></p><p>このリンクは短時間・1回限り有効です。心当たりがない場合は操作不要です。</p>`};
}
