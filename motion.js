'use strict';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.header');
const sectionLinks = [...document.querySelectorAll('.header nav a')];
const sections = sectionLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
let scheduled = false;
function updateNavigation() {
  scheduled = false;
  header?.classList.toggle('is-scrolled', scrollY > 20);
  const range = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty('--reading-progress', range > 0 ? String(scrollY / range) : '0');
  const current = sections.filter(section => section.getBoundingClientRect().top <= 160).at(-1);
  sectionLinks.forEach(link => {
    if (current && link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
addEventListener('scroll', () => {if (!scheduled) {scheduled=true;requestAnimationFrame(updateNavigation);}}, {passive:true});
addEventListener('resize', updateNavigation, {passive:true}); updateNavigation();

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const items = document.querySelectorAll('.section-heading, .gallery-heading, .gallery-grid > figure, .mode-panel, .detail-row > div, .marker-card, .steps > li, .download-section, .faqs');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');observer.unobserve(entry.target);
    }
  }, {threshold:0.06, rootMargin:'0px 0px 25px 0px'});
  items.forEach((item,index) => {
    // Content stays visible without JavaScript and whenever it receives focus.
    item.classList.add('reveal-item');item.style.setProperty('--reveal-delay',`${Math.min(index % 4, 3) * 45}ms`);
    observer.observe(item);
  });
  document.addEventListener('focusin',event => event.target.closest('.reveal-item')?.classList.add('is-revealed'));
  reducedMotion.addEventListener('change',event => {if(event.matches){items.forEach(item=>item.classList.add('is-revealed'));observer.disconnect();}});
}

for (const button of document.querySelectorAll('[role="tab"]')) {
  button.addEventListener('click', () => {
    if (reducedMotion.matches) return;
    const panel=document.getElementById(button.getAttribute('aria-controls'));
    panel.classList.add('is-revealed');
    panel.animate([{opacity:.35,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});
  });
}
