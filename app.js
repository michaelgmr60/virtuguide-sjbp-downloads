'use strict';

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  }
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (!next) return;
    event.preventDefault(); selectTab(next); next.focus();
  });
}

const markers = {
  elementary: 'Elementary', preschool: 'Preschool',
  'senior-high': 'Senior High School', campus: 'Campus overview'
};
const dialog = document.getElementById('marker-dialog');
const fullMarker = document.getElementById('full-marker');
for (const button of document.querySelectorAll('[data-marker]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.marker;
    const name = markers[key];
    const image = `assets/markers/${key}.png`;
    document.getElementById('marker-dialog-title').textContent = name;
    fullMarker.src = image; fullMarker.alt = `${name} original AR picture marker`;
    const download = document.getElementById('dialog-download');
    download.href = image; download.download = `VirtuGuide-${key}-Marker.png`;
    document.getElementById('print-name').textContent = name;
    document.getElementById('print-image').src = image;
    document.body.classList.add('modal-open');
    dialog.showModal();
  });
}
document.getElementById('close-marker').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
document.getElementById('print-marker').addEventListener('click', async () => {
  const image = document.getElementById('print-image');
  try { await image.decode(); window.print(); }
  catch { document.getElementById('dialog-download').focus(); }
});

// A normal anchor remains available even when JavaScript is disabled.
if (window.VIRTUGUIDE_RELEASE) {
  const release = window.VIRTUGUIDE_RELEASE;
  if (release.apkUrl) document.getElementById('apk-download').href = release.apkUrl;
  if (release.releaseUrl) document.getElementById('release-link').href = release.releaseUrl;
  if (release.label) document.getElementById('release-info').textContent = release.label;
}
