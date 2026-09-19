
(() => {
  const reader = document.getElementById("readerWrap");
  const hero = document.querySelector(".fortuneHeader");

  if (!reader || !hero) return;

  function updateReaderFade() {
    const scrollY = window.scrollY;
    const heroHeight = hero.offsetHeight;

    // ヒーローの約20%から消え始め、約80%で完全に消える
    const start = heroHeight * 0.20;
    const end = heroHeight * 0.80;

    let progress = (scrollY - start) / (end - start);
    progress = Math.max(0, Math.min(1, progress));

    const opacity = 1 - progress;
    const blur = progress * 18;
    const scale = 1 + progress * 0.06;

    reader.style.opacity = opacity;
    reader.style.filter = `blur(${blur}px)`;
    reader.style.transform = `scale(${scale})`;
  }

  window.addEventListener("scroll", updateReaderFade, { passive:true });
  window.addEventListener("resize", updateReaderFade);
  updateReaderFade();
})();
 