// Check the JSON Schemas against fixtures/index/{valid,invalid}, the inputHash vectors,
// and the Egatari Text fixtures in fixtures/article-text/ (§9C.2).
// `node tools/test-fixtures.mjs --update-article-text` rewrites every valid/*/expected.json.
import Ajv from 'ajv/dist/2020.js';
import { mystParse } from 'myst-parser';
import { proofDirective } from 'myst-ext-proof';
import { liftMystDirectivesAndRolesTransform, mystTargetsTransform, reconstructHtmlTransform, htmlTransform, containerChildrenTransform, captionParagraphTransform } from 'myst-transforms';
import { VFile } from 'vfile';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ajv = new Ajv({ allErrors: true, strict: false });
for (const f of fs.readdirSync(path.join(root, 'schema'))) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(root, 'schema', f), 'utf8')));
const validate = ajv.getSchema('https://egatari.org/schema/egatari-index.schema.json');

let failed = 0, total = 0;
for (const kind of ['valid', 'invalid']) {
  const dir = path.join(root, 'fixtures', 'index', kind);
  for (const f of fs.readdirSync(dir).sort()) {
    const ok = validate(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    const pass = ok === (kind === 'valid');
    total++;
  if (!pass) failed++;
    console.log(`${pass ? 'ok  ' : 'FAIL'} index/${kind}/${f}${pass ? '' : ' ' + JSON.stringify(validate.errors?.slice(0, 2))}`);
  }
}
const vectors = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', 'input-hash', 'expected.json'), 'utf8'));
for (const [key, v] of Object.entries(vectors)) {
  const h = crypto.createHash('sha256').update(v.canonical, 'utf8').digest('hex');
  const pass = h === v.inputHash;
  total++;
  if (!pass) failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} input-hash ${key}`);
}
// Egatari Text: the front matter is read off first (myst-parser would otherwise
// return it as a `code` node with lang yaml); the rest is parsed with mystParse
// and the proof directive (mystmd's myst-ext-proof), then the structural MyST
// transforms run (lift directives and roles, attach targets, HTML tables into
// table nodes, container children, caption and legend), and `position`, `key`
// and `html_id` are dropped. The tree is before resolution (spec §9C.2).
const DROP = new Set(['position', 'key', 'html_id']);
const FRONT_MATTER = /^---\n[\s\S]*?\n---(?:\n|$)/;
function parseArticleText(text) {
  const body = text.replace(FRONT_MATTER, '');
  const tree = mystParse(body, { directives: [proofDirective] });
  liftMystDirectivesAndRolesTransform(tree);
  mystTargetsTransform(tree);
  reconstructHtmlTransform(tree);
  htmlTransform(tree);
  containerChildrenTransform(tree, new VFile());
  captionParagraphTransform(tree);
  return JSON.parse(JSON.stringify(tree, (k, v) => (DROP.has(k) ? undefined : v)));
}
const textDir = path.join(root, 'fixtures', 'article-text');
const update = process.argv.includes('--update-article-text');
for (const c of fs.readdirSync(path.join(textDir, 'valid')).sort()) {
  const dir = path.join(textDir, 'valid', c);
  const tree = parseArticleText(fs.readFileSync(path.join(dir, 'input.md'), 'utf8'));
  const file = path.join(dir, 'expected.json');
  if (update) fs.writeFileSync(file, JSON.stringify(tree, null, 2) + '\n');
  let pass = true, why = '';
  try { assert.deepStrictEqual(tree, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { pass = false; why = ' ' + e.message.split('\n').slice(0, 6).join(' '); }
  total++;
  if (!pass) failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} article-text/valid/${c}${why}`);
}
for (const c of fs.readdirSync(path.join(textDir, 'invalid')).sort()) {
  const dir = path.join(textDir, 'invalid', c);
  let pass = ['input.md', 'expect.json'].every((f) => fs.existsSync(path.join(dir, f)));
  if (pass) {
    const e = JSON.parse(fs.readFileSync(path.join(dir, 'expect.json'), 'utf8'));
    pass = typeof e.error === 'string' && /^§9C\.[0-9A-Z.]+$/.test(e.spec);
  }
  total++;
  if (!pass) failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} article-text/invalid/${c} (listed, not parsed)`);
}
if (failed) { console.error(`${failed} of ${total} failed`); process.exit(1); }
console.log(`all ${total} passed`);
