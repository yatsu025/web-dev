'use strict';
/**
 * Visual HTML - Chapters + Admin panel
 * Build by Yash Srivastava
 *
 * Chapter open/close is validated on the SERVER for every request.
 * Chapter files live in /private and are never served statically.
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { makeStore } = require('./store');
const { inject } = require('./mobile');

const PRIVATE = path.join(__dirname, 'private');
const RAW = process.env.ADMIN_PATH || '/yadm';
const ADMIN_PATH = /^\/[a-zA-Z0-9_-]{1,60}$/.test(RAW) ? RAW : '/yadm';

const CHAPTERS = [
  { id: 'ch1', title: 'Chapter 01 - Understanding the Web' },
  { id: 'ch2', title: 'Chapter 02 - Introduction to HTML' },
  { id: 'ch3', title: 'Chapter 03 - HTML Building Blocks' },
  { id: 'ch4', title: 'Chapter 04 - Text & Content' },
  { id: 'ch5', title: 'Chapter 05 - Links & Images' },
  { id: 'ch6', title: 'Chapter 06 - Lists' },
  { id: 'ch7', title: 'Chapter 07 - Tables' },
  { id: 'ch8', title: 'Chapter 08 - Forms' },
  { id: 'ch9', title: 'Chapter 09 - Semantic HTML' },
  { id: 'ch10', title: 'Chapter 10 - Build Something' },
  { id: 'ref', title: 'HTML Tags Reference' },
  { id: 'demo', title: 'Final Demo Code' },
];
const IDS = CHAPTERS.map((c) => c.id);
const CH_IDS = new Set(IDS);
const store = makeStore(IDS);

// Pre-load pages once (mobile CSS/JS injected)
const PAGES = {};
IDS.forEach((id) => (PAGES[id] = inject(fs.readFileSync(path.join(PRIVATE, 'chapters', id + '.html'), 'utf8'))));
const MOBILE_INDEX_CSS =
  '<style>img{max-width:100%;height:auto}html,body{overflow-x:hidden}@media(max-width:520px){h1{overflow-wrap:anywhere}}' +
  '.chapter.is-closed{opacity:.6;filter:grayscale(.7)}.chapter.is-closed .chapter-link{background:#ddd;cursor:not-allowed;pointer-events:none}' +
  '.lock-badge{display:inline-block;margin-left:8px;padding:2px 8px;border:2px solid #222;border-radius:6px;background:#ff6b6b;color:#fff;font-size:11px;font-weight:900;vertical-align:middle}</style>';
const INDEX = fs.readFileSync(path.join(PRIVATE, 'index.html'), 'utf8').replace('</head>', MOBILE_INDEX_CSS + '</head>');
const ADMIN_HTML = fs.readFileSync(path.join(PRIVATE, 'views', 'admin.html'), 'utf8');

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': 'no-store',
  });
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

const PUBLIC_CSP =
  "default-src 'self'; img-src * data:; media-src *; style-src 'self' 'unsafe-inline'; " +
  "script-src 'self' 'unsafe-inline' https://unpkg.com; font-src * data:; frame-ancestors 'none'";

const errPage = (code, title, msg, icon) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>body{font-family:system-ui,Arial,sans-serif;background:#f4f1de;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
.b{background:#fff;border:2px solid #222;border-radius:14px;box-shadow:6px 6px 0 #222;padding:32px 28px;max-width:440px;width:100%;text-align:center}
h1{margin:0 0 8px;font-size:24px}p{color:#444;line-height:1.5}a{display:inline-block;margin-top:14px;border:2px solid #222;border-radius:8px;padding:10px 16px;color:#222;text-decoration:none;font-weight:800;background:#ff9f43}</style>
<div class="b"><div style="font-size:46px">${icon}</div><h1>${title}</h1><p>${msg}</p><a href="/">← Back to home</a></div>`;

// ----- Home -----
app.get(['/', '/index.html'], async (req, res) => {
  let state;
  try {
    state = await store.get();
  } catch (e) {
    return res.status(503).type('html').send(errPage(503, 'Temporary error', 'Thodi der baad try karo.', '⚠️'));
  }
  const html = INDEX.replace(/<article class="chapter">([\s\S]*?)<\/article>/g, (m, inner) => {
    const idm = inner.match(/href="\/chapter\/([a-z0-9]+)"/);
    if (!idm || !state.chapters[idm[1]] || state.chapters[idm[1]].open) return m;
    let x = inner.replace(/(<a class="chapter-link")\s+href="[^"]*"/, '$1 aria-disabled="true"');
    x = x.replace('Open Chapter →', '🔒 Closed');
    x = x.replace(/(<h3>[\s\S]*?)(<\/h3>)/, '$1<span class="lock-badge">CLOSED</span>$2');
    return '<article class="chapter is-closed">' + x + '</article>';
  });
  res.set('Content-Security-Policy', PUBLIC_CSP).type('html').send(html);
});

// ----- Chapters: server-side validation -----
app.get('/chapter/:id', async (req, res) => {
  const id = req.params.id;
  res.set('Content-Security-Policy', PUBLIC_CSP);
  if (!CH_IDS.has(id)) return res.status(404).type('text').send('Not found');
  let state;
  try {
    state = await store.get();
  } catch (e) {
    return res.status(503).type('html').send(errPage(503, 'Temporary error', 'Thodi der baad try karo.', '⚠️'));
  }
  if (!state.chapters[id].open) {
    const title = CHAPTERS.find((c) => c.id === id).title;
    return res.status(403).type('html').send(errPage(403, 'This chapter is closed', `${title}<br>abhi available nahi hai. Thodi der baad try karo.`, '🔒'));
  }
  try { await store.hit(id); } catch (e) {}
  res.type('html').send(PAGES[id]);
});

// ----- Admin (no login) -----
const sameOrigin = (req) => {
  const o = req.get('origin');
  if (!o) return true;
  try { return new URL(o).host === req.get('host'); } catch (e) { return false; }
};
const guard = (req, res, next) => {
  if (!sameOrigin(req) || req.get('x-requested-with') !== 'yadm') return res.status(403).json({ error: 'forbidden' });
  next();
};

app.use(ADMIN_PATH + '/api', express.json({ limit: '2kb' }));

app.get(ADMIN_PATH, (req, res) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.set({
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`,
    'X-Robots-Tag': 'noindex, nofollow',
  });
  res.type('html').send(ADMIN_HTML.replace(/__NONCE__/g, nonce).replace('__ADMIN__', ADMIN_PATH));
});

async function snapshot() {
  const [state, hits] = await Promise.all([store.get(), store.hits().catch(() => ({}))]);
  return {
    persistent: store.persistent,
    mode: store.mode,
    chapters: CHAPTERS.map((c) => ({ id: c.id, title: c.title, ...state.chapters[c.id], hits: hits[c.id] || 0 })),
    log: state.log.slice(-20).reverse(),
  };
}
const addLog = (state, msg) => {
  state.log.push({ at: new Date().toISOString(), msg });
  if (state.log.length > 100) state.log.shift();
};

app.get(ADMIN_PATH + '/api/chapters', async (req, res) => {
  try { res.json(await snapshot()); } catch (e) { res.status(500).json({ error: 'storage error' }); }
});

app.post(ADMIN_PATH + '/api/chapters/:id', guard, async (req, res) => {
  const { id } = req.params;
  if (!CH_IDS.has(id) || typeof req.body.open !== 'boolean') return res.status(400).json({ error: 'invalid' });
  try {
    const state = await store.get();
    const c = state.chapters[id];
    if (c.open !== req.body.open) {
      c.open = req.body.open;
      c.changedAt = new Date().toISOString();
      addLog(state, `${CHAPTERS.find((x) => x.id === id).title} -> ${c.open ? 'OPEN' : 'CLOSED'}`);
      await store.set(state);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'storage error' }); }
});

app.post(ADMIN_PATH + '/api/bulk', guard, async (req, res) => {
  if (typeof req.body.open !== 'boolean') return res.status(400).json({ error: 'invalid' });
  try {
    const state = await store.get();
    const now = new Date().toISOString();
    IDS.forEach((id) => { state.chapters[id].open = req.body.open; state.chapters[id].changedAt = now; });
    addLog(state, `ALL -> ${req.body.open ? 'OPEN' : 'CLOSED'}`);
    await store.set(state);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'storage error' }); }
});

app.use((req, res) => res.status(404).type('text').send('Not found'));
app.use((err, req, res, next) => res.status(400).type('text').send('Bad request'));

module.exports = app;
