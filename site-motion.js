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

// A bounded dialog keeps the marker, context and close control together.
const markerDialog = document.getElementById('marker-dialog');
if (markerDialog) {
  const buildings = {
    preschool: { number: '01', title: 'Preschool', tagline: 'Small steps. New discoveries.', description: 'Meet the early learning building of St. John the Baptist Parochial School. Get familiar with its learning spaces before exploring the campus in VirtuGuide.', image: 'school-campus.webp', alt: 'Real SJBP campus photograph', caption: 'THE SCHOOL CAMPUS / REAL PHOTOGRAPH', highlights: ['Discover the early learning building in miniature.', 'Get to know classroom spaces through the campus experience.', 'Move around the AR model for a different point of view.'] },
    elementary: { number: '02', title: 'Elementary', tagline: 'A place to learn. Room to explore.', description: 'Explore the Elementary building, from its ground-floor lobby to classrooms across the upper floors. Follow the familiar corridors in Virtual Tour or take a closer look at its AR model.', image: 'elementary-building.webp', alt: 'Elementary building model with its red roof and classroom corridors', caption: 'ELEMENTARY / BUILDING MODEL', highlights: ['Ground-floor lobby and classroom spaces.', 'Open corridors and a red-roofed building silhouette.', 'Explore individual floors and room details in the app.'] },
    'senior-high': { number: '03', title: 'Senior High School', tagline: 'Bigger ideas. A new perspective.', description: 'Discover the Senior High School building beside the basketball court. Explore its classroom floors and find the computer lab and biology rooms in the virtual campus.', image: 'senior-high-building.webp', alt: 'Senior High School building model beside the blue basketball court', caption: 'SENIOR HIGH / BUILDING MODEL', highlights: ['Classroom floors, a computer lab and biology rooms.', 'Basketball court and flagpole beside the building.', 'Inspect the building floor by floor in AR.'] }
  };
  let returnFocus;
  const image = document.getElementById('marker-dialog-image');
  for (const trigger of document.querySelectorAll('button[data-marker]')) {
    trigger.addEventListener('click', () => {
      const slug = trigger.dataset.marker;
      const building = buildings[slug];
      if (!building) return;
      const title = building.title;
      returnFocus = trigger;
      markerDialog.dataset.building = slug;
      document.getElementById('marker-dialog-title').textContent = title;
      document.getElementById('marker-dialog-description').textContent = building.description;
      document.getElementById('building-card-number').textContent = 'CAMPUS FIELD NOTES / ' + building.number;
      document.getElementById('building-tagline').textContent = building.tagline;
      const buildingImage = document.getElementById('building-dialog-image');
      buildingImage.src = 'assets/' + building.image;
      buildingImage.alt = building.alt;
      document.getElementById('building-image-caption').textContent = building.caption;
      document.getElementById('building-highlights').replaceChildren(...building.highlights.map(text => {
        const item = document.createElement('li'); item.textContent = text; return item;
      }));
      image.src = 'assets/markers/' + slug + '.png';
      image.alt = title + ' AR marker';
      document.getElementById('marker-dialog-download').href = 'assets/markers/' + slug + '.png';
      markerDialog.showModal();
      markerDialog.scrollTop = 0;
      document.documentElement.classList.add('marker-preview-open');
    });
  }
  markerDialog.querySelector('.marker-dialog-close').addEventListener('click', () => markerDialog.close());
  markerDialog.addEventListener('close', () => {
    document.documentElement.classList.remove('marker-preview-open');
    returnFocus?.focus({preventScroll: true});
  });
  markerDialog.addEventListener('click', event => {
    const rect = markerDialog.getBoundingClientRect();
    if (event.target === markerDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) markerDialog.close();
  });
}

// Full screenshots stay uncropped and keyboard accessible.
const screenshotDialog = document.getElementById('screenshot-dialog');
if (screenshotDialog) {
  let screenshotTrigger;
  for (const link of document.querySelectorAll('.screenshot-link')) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      screenshotTrigger = link;
      document.getElementById('screenshot-title').textContent = link.dataset.shotTitle;
      document.getElementById('screenshot-description').textContent = link.dataset.shotDescription;
      const img = document.getElementById('screenshot-full');
      img.src = link.href; img.alt = link.querySelector('img').alt;
      screenshotDialog.showModal();
      document.documentElement.classList.add('marker-preview-open');
    });
  }
  screenshotDialog.querySelector('button').addEventListener('click', () => screenshotDialog.close());
  screenshotDialog.addEventListener('close', () => {
    document.documentElement.classList.remove('marker-preview-open');
    screenshotTrigger?.focus({preventScroll:true});
  });
  screenshotDialog.addEventListener('click', event => {
    const r=screenshotDialog.getBoundingClientRect();
    if(event.target===screenshotDialog && (event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)) screenshotDialog.close();
  });
}
for (const button of document.querySelectorAll('[data-scan-method]')) {
  button.addEventListener('click', () => {
    const screen=button.dataset.scanMethod==='screen';
    document.querySelector('.scan-demo-stage').dataset.method=button.dataset.scanMethod;
    for (const option of document.querySelectorAll('[data-scan-method]')) option.setAttribute('aria-pressed',String(option===button));
    document.getElementById('scan-target-label').textContent=screen?'SECOND DEVICE / FULL IMAGE':'PRINTED ORIGINAL';
    document.getElementById('scan-demo-caption').textContent=screen?'01 · Open the full PNG on another device. 02 · Open AR Mode on your camera phone. 03 · Scan the full image.':'01 · Print at 17 × 17 cm. 02 · Open AR Mode. 03 · Scan the full image in good light.';
  });
}
