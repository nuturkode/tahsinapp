/**
 * Memvalidasi semua template Vue (src/js/templates.js) dengan compiler resmi Vue.
 * Menangkap kesalahan sintaks template tanpa perlu browser.
 * Jalankan: npm run check
 */
import { readFile } from 'node:fs/promises';

let compile;
try {
  ({ compile } = await import('vue/compiler-dom'));
} catch {
  try {
    ({ compile } = await import('vue/dist/vue.esm-bundler.js'));
  } catch (err) {
    console.error('Compiler Vue tidak tersedia. Jalankan: npm i -D vue');
    process.exit(1);
  }
}

const source = await readFile('src/js/templates.js', 'utf8');
const names = [...source.matchAll(/export const (\w+)\s*=\s*\/\* html \*\//g)].map((m) => m[1]);

if (!names.length) {
  console.error('Tidak ada template yang ditemukan di src/js/templates.js');
  process.exit(1);
}

const mod = await import('../src/js/templates.js');
let failed = 0;

for (const name of names) {
  const template = mod[name];
  const errors = [];
  try {
    compile(template, { onError: (e) => errors.push(e), onWarn: () => {} });
  } catch (e) {
    errors.push(e);
  }
  if (errors.length) {
    failed++;
    console.error(`\n✗ ${name}`);
    for (const e of errors) console.error(`  ${e.message}${e.loc ? ` (baris ${e.loc.start.line})` : ''}`);
  } else {
    console.log(`✓ ${name}`);
  }
}

console.log(`\n${names.length - failed}/${names.length} template valid`);
process.exit(failed ? 1 : 0);
