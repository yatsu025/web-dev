'use strict';
/**
 * Tiny key-value storage (no database schema).
 *  - Upstash Redis REST (Vercel Marketplace)  -> persistent on Vercel
 *  - data/state.json                          -> persistent on your own PC / VPS
 *  - memory only                              -> fallback (resets on restart)
 */
const fs = require('fs');
const path = require('path');

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const FILE = path.join(__dirname, 'data', 'state.json');
const KEY = 'vh:state';
const HITS = 'vh:hits';

function makeStore(ids) {
  const blank = () => {
    const chapters = {};
    ids.forEach((id) => (chapters[id] = { open: true, changedAt: null }));
    return { chapters, log: [] };
  };
  const normalize = (s) => {
    const base = blank();
    const out = { chapters: base.chapters, log: Array.isArray(s && s.log) ? s.log : [] };
    ids.forEach((id) => {
      const c = s && s.chapters && s.chapters[id];
      if (c) out.chapters[id] = { open: c.open !== false, changedAt: c.changedAt || null };
    });
    return out;
  };

  // ---------- Redis REST ----------
  if (REST_URL && REST_TOKEN) {
    const cmd = async (args) => {
      const r = await fetch(REST_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + REST_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error || 'redis error ' + r.status);
      return j.result;
    };
    return {
      mode: 'redis',
      persistent: true,
      async get() {
        const raw = await cmd(['GET', KEY]);
        return normalize(raw ? JSON.parse(raw) : null);
      },
      async set(s) {
        await cmd(['SET', KEY, JSON.stringify(s)]);
      },
      async hit(id) {
        await cmd(['HINCRBY', HITS, id, '1']);
      },
      async hits() {
        const arr = (await cmd(['HGETALL', HITS])) || [];
        const o = {};
        for (let i = 0; i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]) || 0;
        return o;
      },
    };
  }

  // ---------- File (local) or memory (Vercel without Redis) ----------
  const canWriteFile = !process.env.VERCEL;
  let mem = null;
  let hits = {};
  if (canWriteFile) {
    try {
      const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      mem = normalize(j);
      hits = j.hits || {};
    } catch (e) {}
  }
  if (!mem) mem = blank();
  let timer = null;
  const flush = () => {
    if (!canWriteFile) return;
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE + '.tmp', JSON.stringify({ ...mem, hits }, null, 2));
      fs.renameSync(FILE + '.tmp', FILE);
    } catch (e) {
      console.error('state save failed:', e.message);
    }
  };
  process.on('exit', flush);
  return {
    mode: canWriteFile ? 'file' : 'memory',
    persistent: canWriteFile,
    async get() {
      return JSON.parse(JSON.stringify(mem));
    },
    async set(s) {
      mem = normalize(s);
      flush();
    },
    async hit(id) {
      hits[id] = (hits[id] || 0) + 1;
      clearTimeout(timer);
      timer = setTimeout(flush, 1500);
    },
    async hits() {
      return { ...hits };
    },
  };
}
module.exports = { makeStore };
