// Counts GitHub-served APK downloads across public releases. No click tracking,
// visitor identifiers or client-side increments are used.
const repository = 'michaelgmr60/virtuguide-sjbp-downloads';
const firstPage = `https://api.github.com/repos/${repository}/releases?per_page=100`;
const cacheKey = 'virtuguide.github-downloads.v1';
const cacheAge = 5 * 60 * 1000;

export function countApkDownloads(releases) {
  if (!Array.isArray(releases)) throw new Error('Unexpected release data');
  let total = 0;
  for (const release of releases) {
    if (release.draft) continue;
    for (const asset of release.assets || []) {
      if (!/\.apk$/i.test(asset.name || '')) continue;
      if (!Number.isSafeInteger(asset.download_count) || asset.download_count < 0) throw new Error('Invalid download count');
      total += asset.download_count;
    }
  }
  if (!Number.isSafeInteger(total)) throw new Error('Download total exceeds safe range');
  return total;
}

export async function fetchDownloadStats(fetcher = fetch, signal) {
  let url = firstPage, count = 0, pages = 0;
  while (url) {
    if (++pages > 10) throw new Error('Too many release pages');
    const response = await fetcher(url, {headers: {Accept: 'application/vnd.github+json'}, signal});
    if (!response.ok) throw new Error(`GitHub unavailable (${response.status})`);
    count += countApkDownloads(await response.json());
    const next = (response.headers.get('link') || '').match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
    if (url && !url.startsWith(`https://api.github.com/repos/${repository}/releases?`)) throw new Error('Unexpected release page');
  }
  return {count, checkedAt: Date.now()};
}

export function initializeDownloadCounter(doc = document) {
  const value = doc.getElementById('download-count');
  const status = doc.getElementById('download-count-status');
  const refresh = doc.getElementById('refresh-download-count');
  const metric = doc.getElementById('download-metric');
  if (!value || !status || !refresh || !metric) return;
  let cached = null, running = false;
  try {
    const stored = JSON.parse(localStorage.getItem(cacheKey));
    if (stored && Number.isSafeInteger(stored.count) && stored.count >= 0 && Number.isFinite(stored.checkedAt) && stored.checkedAt <= Date.now()) cached = stored;
  } catch { /* Storage can be disabled. The live counter still works. */ }
  function show(data, stale = false) {
    value.textContent = new Intl.NumberFormat('en').format(data.count);
    const when = new Date(data.checkedAt).toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    status.textContent = stale ? `Last known GitHub total · ${when}` : `GitHub total · checked ${when}`;
    metric.dataset.state = stale ? 'cached' : 'ready';
  }
  async function update(force = false) {
    if (running) return;
    if (!force && cached && Date.now() - cached.checkedAt < cacheAge) {show(cached);return;}
    running = true; refresh.disabled = true; metric.setAttribute('aria-busy','true');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      cached = await fetchDownloadStats(fetch, controller.signal); show(cached);
      try {localStorage.setItem(cacheKey, JSON.stringify(cached));} catch { /* Optional cache. */ }
    } catch {
      if (cached) show(cached, true);
      else {value.textContent = '—'; status.textContent = 'GitHub count temporarily unavailable'; metric.dataset.state = 'unavailable';}
    } finally {
      clearTimeout(timer);running=false;refresh.disabled=false;metric.setAttribute('aria-busy','false');
    }
  }
  if (cached) show(cached, true);
  refresh.addEventListener('click', () => update(true));
  update();
}

if (typeof document !== 'undefined') initializeDownloadCounter();
