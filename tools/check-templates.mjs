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
const { MATERIAL_ICONS } = await import('./icon-subset.mjs');

/* Setiap ikon Material Symbols yang dipakai harus terdaftar di subset font,
 * kalau tidak ikonnya akan tampil kosong di browser. */
const ICON_FILES = ['src/js/templates.js', 'src/js/views.js', 'src/js/components.js', 'src/js/core.js', 'src/js/card.js'];
const usedIcons = new Set();
for (const file of ICON_FILES) {
  const js = await readFile(file, 'utf8');
  for (const m of js.matchAll(/material-symbols-rounded[^>]*>\s*([a-z0-9_]+)\s*</g)) usedIcons.add(m[1]);
  for (const m of js.matchAll(/icon:\s*['"]([a-z0-9_]+)['"]/g)) usedIcons.add(m[1]);
  for (const m of js.matchAll(/icon="([a-z0-9_]+)"/g)) usedIcons.add(m[1]);
}

const missingIcons = [...usedIcons].filter((icon) => !MATERIAL_ICONS.includes(icon)).sort();
const unsorted = MATERIAL_ICONS.some((icon, i) => i > 0 && MATERIAL_ICONS[i - 1] > icon);
if (missingIcons.length || unsorted) {
  if (missingIcons.length) console.error(`\n✗ Ikon belum terdaftar di tools/icon-subset.mjs: ${missingIcons.join(', ')}`);
  if (unsorted) console.error('\n✗ Daftar MATERIAL_ICONS harus urut abjad (syarat Google Fonts).');
  process.exit(1);
}
console.log(`✓ subset ikon: ${usedIcons.size} ikon terpakai, ${MATERIAL_ICONS.length} terdaftar`);
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
