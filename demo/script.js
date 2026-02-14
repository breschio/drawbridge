// PixlPilot Demo Script (minimal, with tiny quirks)
(function () {
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }


  // Button demo: toggle color + wiggle card slightly
  const bugButton = qs('#bug-button');
  const exampleCard = qs('.example-card');
  if (bugButton && exampleCard) {
    bugButton.addEventListener('click', () => {
      // Toggle a class to simulate a simple change
      exampleCard.classList.toggle('is-active');
      // Subtle wiggle
      exampleCard.style.transform = exampleCard.classList.contains('is-active')
        ? 'translateY(-1px)'
        : 'translateY(0)';
    });
  }

  // Nudge example block slightly left (intentionally odd UX)
  const nudgeLeft = qs('#nudge-left');
  const previewBox = qs('.preview-box');
  if (nudgeLeft && previewBox) {
    nudgeLeft.addEventListener('click', () => {
      const current = parseInt(previewBox.getAttribute('data-nudge') || '0', 10);
      const next = (current + 1) % 3;
      previewBox.style.marginLeft = next === 0 ? '0px' : next === 1 ? '-3px' : '-5px';
      previewBox.setAttribute('data-nudge', String(next));
    });
  }

  // Small scroll fade-in effect (no IntersectionObserver for simplicity)
  function onScroll() {
    qsa('.feature-card, .pricing-card, .example-card').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 60) {
        el.style.transition = 'opacity .35s ease, transform .35s ease';
        el.style.opacity = 1;
        el.style.transform = 'translateY(0)';
      } else {
        el.style.opacity = 0;
        el.style.transform = 'translateY(6px)';
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
})(); 