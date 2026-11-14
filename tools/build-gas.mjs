/**
 * Build untuk Google Apps Script:
 * - dist/styles.css  → ui/Styles.html  (satu <style>, di-include oleh Index.html)
 * - dist/app.js      → ui/App.html     (satu <script>, di-include oleh Index.html)
 * - AppShell.html    → shell HtmlService dengan include()
 *
 * Catatan: nama AppShell.html dipakai (bukan Index.html) agar tidak bentrok dengan
 * index.html milik situs wrapper pada filesystem case-insensitive (macOS/Windows).
 *
 * Jalankan `npm run release` (build web + build GAS) sebelum `clasp push`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { MATERIAL_ICONS } from './icon-subset.mjs';

const read = (p) => readFileSync(p, 'utf8');
const css = read('dist/styles.css');
const js = read('dist/app.js');

// Subset ikon: font penuh ±3 MB, subset ini ±33 KB.
const ICON_SUBSET = MATERIAL_ICONS.join(',');

if (/<\?/.test(css) || /<\?/.test(js)) {
  throw new Error('Kode mengandung "<?" yang akan dieksekusi sebagai scriptlet Apps Script. Hentikan build.');
}

mkdirSync('ui', { recursive: true });

writeFileSync(
  'ui/Styles.html',
  `<!-- generate otomatis oleh tools/build-gas.mjs — jangan diedit -->\n<style>\n${css}\n</style>\n`
);

writeFileSync(
  'ui/App.html',
  `<!-- generate otomatis oleh tools/build-gas.mjs — jangan diedit -->\n<script>\n${js}\n</script>\n`
);

writeFileSync(
  'AppShell.html',
  `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>IbadahKu — Ibadah Harian Muslim</title>
  <meta name="theme-color" content="#0B3B33" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Amiri:wght@400;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&icon_names=${ICON_SUBSET}&display=swap" rel="stylesheet" />
  <?!= include('ui/Styles') ?>
</head>
<body>
  <div id="app"></div>
  <div id="boot" style="display:grid;min-height:100vh;place-items:center;font:14px sans-serif;color:#0E7C66">
    Memuat IbadahKu…
  </div>
  <!-- SweetAlert2, flatpickr, dan ApexCharts dimuat sesuai kebutuhan oleh
       ui/App (core.js), bukan saat halaman dibuka. -->
  <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
  <?!= include('ui/App') ?>
</body>
</html>
`
);

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;
console.log(`ui/Styles.html ${kb(css)} · ui/App.html ${kb(js)} · AppShell.html dibuat`);
