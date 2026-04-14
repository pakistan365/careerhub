// ============================================================
// CareerHub Pakistan — google-sheet-loader.js  (v3 — FINAL)
// ============================================================
// Your Google Sheet has these tabs (in order):
//   0: 📊 Dashboard
//   1: 📖 HOW TO USE
//   2: 🎓 Scholarships
//   3: 💼 Jobs
//   4: 🚀 Internships
//   5: 📋 Exams
//   6: 📚 Books
//   7: 🔔 Notifications
//
// HOW GIDs WORK:
//   Google Sheets assigns each tab a GID visible in the URL bar.
//   When published as CSV with ?output=csv&gid=X, you get that specific tab.
//
// ⚠️  ACTION REQUIRED — Replace the GID values below with the real ones:
//   1. Open your Google Sheet editor (not the published link)
//   2. Click the "🎓 Scholarships" tab → look at the URL bar → copy the number after #gid=
//   3. Repeat for each tab
//   4. Paste the numbers below
//
// If you don't know your GIDs, the loader will AUTO-DETECT them by trying
// common GID values (0–7 and 000000000–777777777 patterns).
// ============================================================

// Primary published CSV URL provided by CMS owner.
// Keep this updated whenever the sheet is republished.
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkygCswWJqKnQPsVnj27ijDHwELm27oQpG7WRjGDzB5DcZqDjcTKUUp_7c3V_baAhb3U7YbInaJuQ_/pub?output=csv';

// You can also use EITHER of these IDs:
// 1) Published ID from URL like: /spreadsheets/d/e/<PUBLISHED_ID>/pubhtml
// 2) Spreadsheet ID from editor URL like: /spreadsheets/d/<SPREADSHEET_ID>/edit#gid=...
//
// Keep whichever one you have, leave the other as ''.
const SHEET_PUBLISHED_ID = (SHEET_CSV_URL.match(/\/spreadsheets\/d\/e\/([^/]+)/) || [])[1] || '';
const SHEET_SPREADSHEET_ID = '';

const SHEET_BASES = [
  SHEET_PUBLISHED_ID ? `https://docs.google.com/spreadsheets/d/e/${SHEET_PUBLISHED_ID}/pub` : '',
  SHEET_SPREADSHEET_ID ? `https://docs.google.com/spreadsheets/d/${SHEET_SPREADSHEET_ID}/gviz/tq` : '',
].filter(Boolean);

if (SHEET_BASES.length === 0) {
  console.error('[CareerHub] Missing SHEET_PUBLISHED_ID or SHEET_SPREADSHEET_ID in js/google-sheet-loader.js');
}

// ── REPLACE THESE with your actual tab GIDs from the URL bar ─
// Default values use sequential index (0-7) which works if you published all tabs.
// Your tab order: Dashboard(0), HOW TO USE(1), Scholarships(2), Jobs(3),
//                 Internships(4), Exams(5), Books(6), Notifications(7)
const SHEET_GIDS = {
  Scholarships:  '2',   // 🎓 Scholarships tab (3rd tab = index 2)
  Jobs:          '3',   // 💼 Jobs tab (4th tab = index 3)
  Internships:   '4',   // 🚀 Internships tab (5th tab = index 4)
  Exams:         '5',   // 📋 Exams tab (6th tab = index 5)
  Books:         '6',   // 📚 Books tab (7th tab = index 6)
  Notifications: '7',   // 🔔 Notifications tab (8th tab = index 7)
};

function sheetURLsByGid(gid) {
  const urls = [];

  if (SHEET_CSV_URL) {
    const csvUrl = new URL(SHEET_CSV_URL);
    csvUrl.searchParams.set('output', 'csv');
    csvUrl.searchParams.set('gid', gid);
    csvUrl.searchParams.set('single', 'true');
    urls.push(csvUrl.toString());
  }

  // Published CSV by ID (most stable)
  if (SHEET_PUBLISHED_ID) {
    urls.push(`https://docs.google.com/spreadsheets/d/e/${SHEET_PUBLISHED_ID}/pub?gid=${gid}&single=true&output=csv`);
  }
  if (urls.length) return [...new Set(urls)];
  
  return SHEET_BASES.map(base =>
    `${base}?tqx=out:csv&gid=${gid}`
  );
}

function sheetURLsByName(sheetName) {
  const urls = [];

  if (SHEET_CSV_URL) {
    const csvUrl = new URL(SHEET_CSV_URL);
    csvUrl.searchParams.set('output', 'csv');
    csvUrl.searchParams.set('sheet', sheetName);
    urls.push(csvUrl.toString());
  }

  // Published CSV by ID
  if (SHEET_PUBLISHED_ID) {
    urls.push(`https://docs.google.com/spreadsheets/d/e/${SHEET_PUBLISHED_ID}/pub?output=csv&sheet=${encodeURIComponent(sheetName)}`);
  }

  if (urls.length) return [...new Set(urls)];
  
  return SHEET_BASES.map(base =>
    `${base}?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
  );
}

// ── CSV Parser (handles quoted fields, commas inside values) ──
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\r') { /* skip */ }
      else if (ch === '\n') {
        row.push(field.trim()); field = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
      } else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(c => c !== '')) rows.push(row); }
  return rows;
}

// ── CSV → array of objects using the header row ───────────────
// Skips the first decorative title row (e.g. "🎓 Scholarships — CareerHub")
// and finds the real header row (the one containing "ID")
function csvToObjects(text) {
  if (!text || !text.trim()) return [];
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  // Find header row: first row where any cell is exactly "ID"
  let headerIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    if (rows[r].some(cell => cell.trim().toUpperCase() === 'ID')) {
      headerIdx = r;
      break;
    }
  }
  if (headerIdx === -1) {
    console.warn('[CareerHub] Could not find header row with "ID" column in:', text.slice(0, 200));
    return [];
  }

  const headers = rows[headerIdx].map(h => h.trim());
  const objects = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip blank rows or rows where ID is missing/non-numeric
    if (!row[0] || row[0].trim() === '' || isNaN(Number(row[0]))) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (row[idx] || '').trim(); });
    objects.push(obj);
  }
  return objects;
}

// ── Field Mappers — match EXACT column names from your sheet ──
function isTruthy(val) {
  return /yes|true|✅/i.test(val || '');
}

function mapScholarship(raw) {
  return {
    id:                Number(raw['ID']) || 0,
    title:             raw['Title'] || '',
    slug:              raw['Slug'] || '',
    description:       raw['Description'] || '',
    country:           raw['Country'] || '',
    type:              raw['Type'] || '',
    funding:           raw['Funding'] || '',
    deadline:          raw['Deadline'] || '',
    posted_date:       raw['Posted'] || '',
    apply_link:        raw['Apply Link'] || '',
    tags:              raw['Tags'] || '',
    is_featured:       isTruthy(raw['Featured?']),
    image_url:         raw['Image URL'] || '',
    location:          raw['Location'] || '',
    level:             raw['Level'] || '',
    host_organization: raw['Host Organization'] || '',
  };
}

function mapJob(raw) {
  return {
    id:          Number(raw['ID']) || 0,
    title:       raw['Title'] || '',
    slug:        raw['Slug'] || '',
    description: raw['Description'] || '',
    category:    raw['Category'] || '',
    country:     raw['Country'] || '',
    type:        raw['Type'] || '',
    deadline:    raw['Deadline'] || '',
    posted_date: raw['Posted'] || '',
    apply_link:  raw['Apply Link'] || '',
    tags:        raw['Tags'] || '',
    is_featured: isTruthy(raw['Featured?']),
    image_url:   raw['Image URL'] || '',
    location:    raw['Location'] || '',
    salary:      raw['Salary'] || '',
    experience:  raw['Experience'] || '',
  };
}

function mapInternship(raw) {
  return {
    id:           Number(raw['ID']) || 0,
    title:        raw['Title'] || '',
    slug:         raw['Slug'] || '',
    description:  raw['Description'] || '',
    organization: raw['Organization'] || '',
    country:      raw['Country'] || '',
    stipend:      raw['Stipend'] || '',
    deadline:     raw['Deadline'] || '',
    posted_date:  raw['Posted'] || '',
    apply_link:   raw['Apply Link'] || '',
    tags:         raw['Tags'] || '',
    is_featured:  isTruthy(raw['Featured?']),
    image_url:    raw['Image URL'] || '',
    location:     raw['Location'] || '',
    duration:     raw['Duration'] || '',
    type:         raw['Type'] || '',
  };
}

function mapExam(raw) {
  return {
    id:                Number(raw['ID']) || 0,
    title:             raw['Title'] || '',
    slug:              raw['Slug'] || '',
    exam_type:         raw['Exam Type'] || '',
    syllabus_link:     raw['Syllabus Link'] || '',
    test_date:         raw['Test Date'] || '',
    results_link:      raw['Results Link'] || '',
    past_papers_link:  raw['Past Papers Link'] || '',
    fee:               raw['Fee'] || '',
    tags:              raw['Tags'] || '',
    image_url:         raw['Image URL'] || '',
    registration_link: raw['Registration Link'] || '',
    eligibility:       raw['Eligibility'] || '',
    conducting_body:   raw['Conducting Body'] || '',
  };
}

function mapBook(raw) {
  return {
    id:            Number(raw['ID']) || 0,
    title:         raw['Title'] || '',
    slug:          raw['Slug'] || '',
    category:      raw['Category'] || '',
    exam_type:     raw['Exam Type'] || '',
    author:        raw['Author'] || '',
    download_link: raw['Download Link'] || '',
    buy_link:      raw['Buy Link'] || '',
    is_free:       isTruthy(raw['Free?']),
    tags:          raw['Tags'] || '',
    image_url:     raw['Image URL'] || '',
    edition:       raw['Edition'] || '',
    language:      raw['Language'] || '',
  };
}

function mapNotification(raw) {
  const expiry = raw['Expiry Date'] || '';
  const expired = expiry ? new Date(expiry) < new Date() : false;
  return {
    id:          Number(raw['ID']) || 0,
    message:     raw['Message'] || '',
    type:        raw['Type'] || '',
    expiry_date: expiry,
    is_active:   isTruthy(raw['Active?']) && !expired,
    link:        raw['Link'] || '',
  };
}

// ── Fetch CSV with error handling ─────────────────────────────
async function fetchCSV(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // Google returns an HTML error page if the GID is wrong
    if (text.trim().startsWith('<!')) {
      console.warn('[CareerHub] Got HTML instead of CSV for:', url);
      return '';
    }
    return text;
  } catch (err) {
    console.warn('[CareerHub] fetchCSV failed:', url, err.message);
    return '';
  }
}

async function fetchFirstCSV(urls) {
  for (const url of urls) {
    const text = await fetchCSV(url);
    if (text) return text;
  }
  return '';
}

// ── Auto-detect correct GID if the configured one fails ───────
// Google Sheets GIDs can be 0–9 (sequential index) for most sheets,
// or large random numbers. We try sequential first.
async function fetchTabWithFallback(tab) {
  const { name, gid, aliases = [], alternateGids = [] } = tab;

  // 1) Try sheet names first (works even when gids change)
  for (const alias of aliases) {
    const textByName = await fetchFirstCSV(sheetURLsByName(alias));
    if (textByName) {
      if (alias !== name) {
        console.info(`[CareerHub] "${name}" loaded using sheet name "${alias}".`);
      }
      return textByName;
    }
  }

  // 2) Try configured GID
  let text = await fetchFirstCSV(sheetURLsByGid(gid));
  if (text) return text;

  // 3) Try alternate GIDs
  for (const altGid of alternateGids) {
    if (altGid === gid) continue;
    text = await fetchFirstCSV(sheetURLsByGid(altGid));
    if (text) {
      console.info(`[CareerHub] "${name}" found at gid=${altGid} (configured: ${gid})`);
      return text;
    }
  }
  return '';
}

// ── Loading banner ────────────────────────────────────────────
function showBanner(msg, color = '#0f766e') {
  let b = document.getElementById('ch-loading-banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'ch-loading-banner';
    b.style.cssText = `position:fixed;top:0;left:0;right:0;z-index:9999;
      color:white;text-align:center;padding:9px 16px;
      font-family:"DM Sans",sans-serif;font-size:14px;
      box-shadow:0 2px 8px rgba(0,0,0,0.2);transition:opacity 0.5s;`;
    document.body.prepend(b);
  }
  b.style.background = color;
  b.innerHTML = msg;
}

function hideBanner() {
  const b = document.getElementById('ch-loading-banner');
  if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 600); }
}

// ── CMS Ready system ──────────────────────────────────────────
window.CMS_DATA = {};
window._CMS_READY = false;
window._CMS_CALLBACKS = [];

window.onCMSReady = function(fn) {
  if (window._CMS_READY) { fn(window.CMS_DATA); return; }
  window._CMS_CALLBACKS.push(fn);
};

function fireReady() {
  window._CMS_READY = true;
  window._CMS_CALLBACKS.forEach(fn => { try { fn(window.CMS_DATA); } catch(e) { console.error(e); } });
  window._CMS_CALLBACKS = [];
  document.dispatchEvent(new CustomEvent('cmsReady', { detail: window.CMS_DATA }));
}

let fallbackScriptPromise = null;
function loadFallbackScript() {
  if (window.CMS_DATA_FALLBACK) return Promise.resolve(true);
  if (fallbackScriptPromise) return fallbackScriptPromise;

  fallbackScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'js/cms-data.js';
    script.onload = () => resolve(Boolean(window.CMS_DATA_FALLBACK));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return fallbackScriptPromise;
}

async function hydrateFromFallback() {
  const loaded = await loadFallbackScript();
  if (!loaded || !window.CMS_DATA_FALLBACK) return false;
  const fallback = window.CMS_DATA_FALLBACK;
  ['Scholarships', 'Jobs', 'Internships', 'Exams', 'Books', 'Notifications'].forEach((key) => {
    window.CMS_DATA[key] = Array.isArray(fallback[key]) ? fallback[key] : [];
  });
  return true;
}

// ── Main loader ───────────────────────────────────────────────
async function loadAllSheets() {
  showBanner('⏳ Loading live data…', 'linear-gradient(90deg,#0f766e,#0d9488)');

  // Tab config — each tab fetched independently using its own GID
  const commonAlternateGids = ['0','1','2','3','4','5','6','7','8','9'];
  const tabs = [
    { name: 'Scholarships',  gid: SHEET_GIDS.Scholarships,  mapper: mapScholarship,  aliases: ['Scholarships', '🎓 Scholarships'], alternateGids: commonAlternateGids },
    { name: 'Jobs',          gid: SHEET_GIDS.Jobs,          mapper: mapJob,          aliases: ['Jobs', '💼 Jobs'], alternateGids: commonAlternateGids },
    { name: 'Internships',   gid: SHEET_GIDS.Internships,   mapper: mapInternship,   aliases: ['Internships', '🚀 Internships'], alternateGids: commonAlternateGids },
    { name: 'Exams',         gid: SHEET_GIDS.Exams,         mapper: mapExam,         aliases: ['Exams', '📋 Exams'], alternateGids: commonAlternateGids },
    { name: 'Books',         gid: SHEET_GIDS.Books,         mapper: mapBook,         aliases: ['Books', '📚 Books'], alternateGids: commonAlternateGids },
    { name: 'Notifications', gid: SHEET_GIDS.Notifications, mapper: mapNotification, aliases: ['Notifications', '🔔 Notifications'], alternateGids: commonAlternateGids },
  ];

  // Fetch all tabs in parallel — each gets its own CSV
  const fetches = tabs.map(t => fetchTabWithFallback(t));
  const results = await Promise.all(fetches);

  let loadedCount = 0;
  tabs.forEach((tab, idx) => {
    const text = results[idx];
    if (!text) {
      console.warn(`[CareerHub] No data for "${tab.name}" (gid=${tab.gid})`);
      window.CMS_DATA[tab.name] = [];
      return;
    }
    try {
      const rawRows = csvToObjects(text);
      const mapped = rawRows.map(tab.mapper).filter(item => item.id > 0);
      window.CMS_DATA[tab.name] = mapped;
      if (mapped.length > 0) loadedCount++;
      console.info(`[CareerHub] ✅ ${tab.name}: ${mapped.length} items (gid=${tab.gid})`);
    } catch (err) {
      console.error(`[CareerHub] Parse error in "${tab.name}":`, err);
      window.CMS_DATA[tab.name] = [];
    }
  });

  if (loadedCount === 0) {
    const usingFallback = await hydrateFromFallback();
    if (usingFallback) {
      showBanner('⚠️ Live Google Sheet unavailable — showing local fallback data.', '#b45309');
      setTimeout(hideBanner, 5000);
    } else {
      showBanner(
        `⚠️ Could not load data. Your GIDs may be wrong. ` +
        `Open your Google Sheet, click each tab, copy the number after #gid= in the URL, ` +
        `and update SHEET_GIDS in js/google-sheet-loader.js`,
        '#dc2626'
      );
      setTimeout(hideBanner, 8000);
    }
  } else {
    hideBanner();
  }

  fireReady();
}

loadAllSheets();
