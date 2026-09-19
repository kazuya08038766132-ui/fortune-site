
document.addEventListener('DOMContentLoaded',()=>{
  const detail=document.getElementById('stripeCheckoutBtn');
  if(detail) detail.addEventListener('click',(ev)=>{
    if(window.FORTUNE_DEV_PREVIEW && new URLSearchParams(location.search).get('dev')==='1') return;
    ev.preventDefault();ev.stopImmediatePropagation();
    sessionStorage.setItem('fortune_birth',document.getElementById('birth')?.value||'');
    sessionStorage.setItem('fortune_theme',document.getElementById('theme')?.value||'総合');
    sessionStorage.setItem('fortune_question',document.getElementById('question')?.value||'');
    location.href='/checkout-confirm.html?product=detail';
  },true);
  const member=document.getElementById('membershipCheckoutBtn');
  if(member) member.addEventListener('click',(ev)=>{
    if(window.FORTUNE_DEV_PREVIEW && new URLSearchParams(location.search).get('dev')==='1') return;
    ev.preventDefault();ev.stopImmediatePropagation();
    location.href='/checkout-confirm.html?product=membership';
  },true);
});
