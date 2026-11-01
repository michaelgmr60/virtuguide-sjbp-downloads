// Progressive enhancement: every section remains readable without JavaScript.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed'); observer.unobserve(entry.target);
    }
  }, {threshold: 0.08});
  for (const section of document.querySelectorAll('[data-reveal]')) observer.observe(section);
  document.documentElement.classList.add('reveal-enabled');
}

const motionButton = document.getElementById('toggle-motion');
if (motionButton) {
  let paused = false;
  try { paused = localStorage.getItem('virtuguide.pause-motion') === 'true'; } catch {}
  function applyMotion() {
    document.documentElement.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
  }
  motionButton.addEventListener('click', () => {
    paused = !paused; applyMotion();
    try { localStorage.setItem('virtuguide.pause-motion', String(paused)); } catch {}
  });
  applyMotion();
}
