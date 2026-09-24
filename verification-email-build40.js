export function verificationEmail({baseUrl,token}){
 const u=new URL('/verify-email.html',baseUrl);u.searchParams.set('token',token);
 const link=u.toString();
 return {subject:'総合占い｜メールアドレス確認',html:`<p>メールアドレス確認のため、30分以内に次のリンクを同じブラウザで開いてください。</p><p><a href="${link}">メールアドレスを確認する</a></p><p>心当たりがない場合は、このメールを破棄してください。</p>`,text:`メールアドレス確認のため、30分以内に同じブラウザで次のURLを開いてください。\n${link}\n心当たりがない場合は破棄してください。`};
}
