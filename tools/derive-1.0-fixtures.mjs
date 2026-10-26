// Derive the 1.0-shape document fixtures from one valid file written by a producer
// (fixtures/documents-1.0/minimal.ega.html). Each derived file is a small, documented text edit;
// when the edit touches the index, its data-sha256 is recomputed so that the file fails (or passes)
// for the reason the fixture is about, not for a broken hash.
//   node tools/derive-1.0-fixtures.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'fixtures', 'documents-1.0');
const base = fs.readFileSync(path.join(dir, 'minimal.ega.html'), 'utf8');
const sha = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');

// index: <script type="application/vnd.egatari+json" id="egatari-index" data-sha256="…">JSON</script>
const IDX = /(<script type="application\/vnd\.egatari\+json" id="egatari-index" data-sha256=")([0-9a-f]{64})(">)([\s\S]*?)(<\/script>)/;
const META = /(<script type="application\/json" id="deck-meta">)([\s\S]*?)(<\/script>)/;
const CSP = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/;

function editIndex(html, fn) {
  const m = html.match(IDX); if (!m) throw new Error('no index');
  const text = JSON.stringify(fn(JSON.parse(m[4]))).replace(/</g, '\\u003c');
  return html.replace(IDX, (_, a, _h, c, _t, e) => a + sha(text) + c + text + e);
}
function editMeta(html, fn) {
  const m = html.match(META); if (!m) throw new Error('no deck-meta');
  const text = JSON.stringify(fn(JSON.parse(m[2]))).replace(/</g, '\\u003c');
  return html.replace(META, (_, a, _t, c) => a + text + c);
}
function editPolicy(html, fn) {
  if (!CSP.test(html)) throw new Error('no policy');
  return html.replace(CSP, (_, p) => `<meta http-equiv="Content-Security-Policy" content="${fn(p)}">`);
}
const drop = (k) => (o) => { const c = { ...o }; delete c[k]; return c; };

const out = {
  'missing-player': [
    editMeta(editIndex(base, drop('player')), drop('player')),
    { read: { preDraft: true }, play: true, edit: 'may-refuse' },
  ],
  'no-policy': [
    base.replace(CSP, ''),
    { read: 'ok', conforming: false, report: 'no-policy', play: true },
  ],
  'policy-loosened': [
    editPolicy(base, (p) => p.replace("connect-src 'none'", 'connect-src https://example.org')),
    { read: 'ok', conforming: false, report: 'policy-extra-source', play: true },
  ],
  'policy-reordered': [
    editPolicy(base, (p) => p.split(/;\s*/).reverse().join('; ')),
    { read: 'ok', conforming: true, play: true },
  ],
  'foreign-player': [
    editMeta(editIndex(base, (ix) => ({ ...ix, player: { name: 'example-player', version: '2.3.4', title: 'Example Player' } })),
      (m) => ({ ...m, player: { name: 'example-player', version: '2.3.4', title: 'Example Player' } })),
    { read: 'ok', play: true, tierA: { keeps: ['player', 'generator'] }, rebuild: { warns: 'player-change' } },
  ],
};
fs.writeFileSync(path.join(dir, 'minimal.expect.json'), JSON.stringify({ read: 'ok', conforming: true, play: true }, null, 2) + '\n');
for (const [name, [html, expect]] of Object.entries(out)) {
  fs.writeFileSync(path.join(dir, `${name}.ega.html`), html);
  fs.writeFileSync(path.join(dir, `${name}.expect.json`), JSON.stringify(expect, null, 2) + '\n');
}
console.log('derived', Object.keys(out).length, 'fixtures');
