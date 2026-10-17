// Check the JSON Schemas against fixtures/index/{valid,invalid} and the inputHash vectors.
import Ajv from 'ajv/dist/2020.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ajv = new Ajv({ allErrors: true, strict: false });
for (const f of fs.readdirSync(path.join(root, 'schema'))) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(root, 'schema', f), 'utf8')));
const validate = ajv.getSchema('https://etoki-org.github.io/etoki-spec/schema/etoki-index.schema.json');

let failed = 0;
for (const kind of ['valid', 'invalid']) {
  const dir = path.join(root, 'fixtures', 'index', kind);
  for (const f of fs.readdirSync(dir).sort()) {
    const ok = validate(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    const pass = ok === (kind === 'valid');
    if (!pass) failed++;
    console.log(`${pass ? 'ok  ' : 'FAIL'} index/${kind}/${f}${pass ? '' : ' ' + JSON.stringify(validate.errors?.slice(0, 2))}`);
  }
}
const vectors = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', 'input-hash', 'expected.json'), 'utf8'));
for (const [key, v] of Object.entries(vectors)) {
  const h = crypto.createHash('sha256').update(v.canonical, 'utf8').digest('hex');
  const pass = h === v.inputHash;
  if (!pass) failed++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} input-hash ${key}`);
}
if (failed) { console.error(`${failed} failed`); process.exit(1); }
