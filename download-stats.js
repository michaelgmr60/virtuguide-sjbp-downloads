// Counts GitHub-served APK downloads across public releases. No click tracking,
// visitor identifiers or client-side increments are used.
const repository = 'michaelgmr60/virtuguide-sjbps-downloads';
const firstPage = `https://api.github.com/repos/${repository}/releases?per_page=100`;
const cacheKey = 'virtuguide.github-downloads.v2';
const cacheAge = 5 * 60 * 1000;

// Include prereleases: the app is distributed as a public alpha.
export function selectLatestApk(releases) {
  const prefix = `https://github.com/${repository}/releases/`;
  for (const release of [...releases].filter(r => !r.draft && Number.isFinite(Date.parse(r.published_at))).sort((a,b) => Date.parse(b.published_at)-Date.parse(a.published_at))) {
    const asset = (release.assets || []).find(a => /\.apk$/i.test(a.name || '') && a.state === 'uploaded' && Number.isSafeInteger(a.size) && a.size > 0 && a.browser_download_url?.startsWith(prefix + 'download/'));
    if (!asset || !release.html_url?.startsWith(prefix + 'tag/')) continue;
    return {tag:release.tag_name,date:release.published_at,apkUrl:asset.browser_download_url,releaseUrl:release.html_url,bytes:asset.size,notes:String(release.body || 'See the release details on GitHub.').slice(0,16000)};
  }
  return null;
}

export function renderRelease(doc, release, stale = false) {
  const link = doc.getElementById('apk-download');
  const info = doc.getElementById('release-info');
  if (!link || !info || !release) return;
  const date = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Manila'}).format(new Date(release.date));
  link.href = release.apkUrl;
  info.textContent = `${release.tag} · ${date} · ${(release.bytes / 1e6).toFixed(1)} MB`;
  doc.getElementById('release-link').href = release.releaseUrl;
  doc.getElementById('release-notes-text').textContent = release.notes;
  const android = release.notes.match(/Android\s+(\d+(?:\.\d+)?)\+/i);
  const requirements = [];
  if (android) requirements.push(`Android ${android[1]}+`);
  if (/32-bit|ARMv7|ARM32|armeabi-v7a/i.test(release.notes)) requirements.push('32-bit ARM');
  if (/64-bit|ARM64/i.test(release.notes)) requirements.push('64-bit ARM');
  if (/OpenGL ES\s*3/i.test(release.notes)) requirements.push('OpenGL ES 3');
  doc.getElementById('release-requirements').textContent = (requirements.length ? requirements.join(' · ') : 'Check the release notes for device requirements.') + ' · Camera AR needs an ARCore-supported device.';
  doc.getElementById('release-check-status').textContent = stale ? 'Last checked release · GitHub is temporarily unavailable.' : 'Latest published APK checked on GitHub · includes alpha releases.';
}

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
  let url = firstPage, count = 0, pages = 0, latest = null;
  while (url) {
    if (++pages > 10) throw new Error('Too many release pages');
    const response = await fetcher(url, {headers: {Accept: 'application/vnd.github+json'}, signal});
    if (!response.ok) throw new Error(`GitHub unavailable (${response.status})`);
    const releases = await response.json();
    count += countApkDownloads(releases);
    const candidate = selectLatestApk(releases);
    if (candidate && (!latest || Date.parse(candidate.date) > Date.parse(latest.date))) latest = candidate;
    const next = (response.headers.get('link') || '').match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
    if (url && !url.startsWith(`https://api.github.com/repos/${repository}/releases?`)) throw new Error('Unexpected release page');
  }
  return {count, checkedAt: Date.now(), latest};
}

export function initializeDownloadCounter(doc = document) {
  const value = doc.getElementById('download-count');
  const status = doc.getElementById('download-count-status');
  const refresh = doc.getElementById('refresh-download-count');
  const metric = doc.getElementById('download-metric');
  if (!value || !status || !refresh || !metric) return;
  // The bundled link comes from a signature-verified APK. An old per-origin
  // browser cache must never replace it with an earlier release while loading.
  const bundledUrl = doc.getElementById('apk-download')?.href;
  const bundledRequirements = doc.getElementById('release-requirements')?.textContent;
  const bundledVersion = bundledUrl?.match(/\/download\/v?(\d+)\.(\d+)\.(\d+)[^/]*\//)?.slice(1).map(Number);
  function olderThanBundle(release) {
    const version = release?.tag?.match(/^v?(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number);
    if (!version || !bundledVersion) return false;
    for (let i=0;i<3;i++) if (version[i]!==bundledVersion[i]) return version[i]<bundledVersion[i];
    return false;
  }
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
    if (olderThanBundle(data.latest)) {
      const releaseStatus = doc.getElementById('release-check-status');
      if (releaseStatus) releaseStatus.textContent = 'Using the newer verified download bundled with this website.';
    } else {
      renderRelease(doc, data.latest, stale);
      if (data.latest?.apkUrl === bundledUrl && bundledRequirements) {
        doc.getElementById('release-requirements').textContent = bundledRequirements;
      }
    }
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
      const releaseStatus = doc.getElementById('release-check-status');
      if (!cached?.latest && releaseStatus) releaseStatus.textContent = 'Using the bundled release details. GitHub could not be checked; see release details for updates.';
    } finally {
      clearTimeout(timer);running=false;refresh.disabled=false;metric.setAttribute('aria-busy','false');
    }
  }
  if (cached) show(cached, true);
  refresh.addEventListener('click', () => update(true));
  doc.getElementById('refresh-release')?.addEventListener('click', () => update(true));
  doc.getElementById('apk-download')?.addEventListener('click', () => {
    doc.getElementById('apk-download-status').textContent = 'Download requested. Check your browser Downloads for progress and completion. If nothing appears, open the release details below.';
  });
  update();
}

if (typeof document !== 'undefined') initializeDownloadCounter();
