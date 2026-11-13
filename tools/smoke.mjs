/**
 * Smoke test DOM tanpa browser:
 * - memuat Vue global build + dist/app.js di happy-dom
 * - membuka setiap route dan memastikan view ter-render tanpa error
 * Jalankan: npm run smoke (butuh `npm run build` lebih dulu)
 */
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';

const win = new Window({ url: 'http://localhost:3000/' });
const doc = win.document;

const setGlobal = (key, value) => {
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  } catch (err) {
    try {
      globalThis[key] = value;
    } catch (err2) {
      /* global bawaan Node yang read-only: abaikan */
    }
  }
};

setGlobal('window', win);
setGlobal('document', doc);
setGlobal('navigator', win.navigator);
setGlobal('localStorage', win.localStorage);
setGlobal('location', win.location);
setGlobal('HTMLElement', win.HTMLElement);
setGlobal('Element', win.Element);
setGlobal('Node', win.Node);

/* Vue butuh constructor DOM lain saat membuat elemen/atribut. */
[
  'SVGElement',
  'SVGSVGElement',
  'Text',
  'Comment',
  'DocumentFragment',
  'Document',
  'HTMLDocument',
  'Window',
  'ShadowRoot',
  'HTMLInputElement',
  'HTMLSelectElement',
  'HTMLTextAreaElement',
  'HTMLTemplateElement',
  'HTMLButtonElement',
  'HTMLDivElement',
  'HTMLAnchorElement',
  'HTMLCanvasElement',
  'HTMLImageElement',
  'HTMLFormElement',
  'HTMLScriptElement',
  'HTMLStyleElement',
  'HTMLIFrameElement',
  'HTMLSlotElement',
  'Image',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'FocusEvent',
  'InputEvent',
  'NodeList',
  'DOMTokenList',
  'CSSStyleDeclaration',
  'MutationObserver',
  'ResizeObserver',
  'DOMRect',
  'NamedNodeMap',
  'Attr',
  'Range'
].forEach((key) => {
  if (win[key]) setGlobal(key, win[key]);
});

setGlobal('matchMedia', win.matchMedia ? win.matchMedia.bind(win) : () => ({ matches: false, addEventListener() {} }));
setGlobal('getComputedStyle', win.getComputedStyle.bind(win));
setGlobal('requestAnimationFrame', (cb) => setTimeout(() => cb(Date.now()), 0));

/* stub library eksternal yang hanya butuh DOM asli */
win.Swal = { fire: async () => ({ isConfirmed: false }) };
win.flatpickr = () => ({ destroy() {}, setDate() {} });
win.ApexCharts = class {
  constructor(el, options) {
    this.el = el;
    this.options = options;
    this.destroyed = false;
  }
  render() {
    this.el.innerHTML = '<svg data-chart="' + this.options.chart.type + '"></svg>';
    return Promise.resolve();
  }
  destroy() {
    this.destroyed = true;
  }
};

const errors = [];
win.addEventListener('error', (e) => errors.push('window.error: ' + (e.message || e)));
process.on('unhandledRejection', (e) => errors.push('unhandledRejection: ' + ((e && e.message) || e)));

doc.body.innerHTML = '<div id="boot"></div><div id="app"></div>';

/* Build global lebih sulit di-inject ke happy-dom; pakai build Node (sama-sama memuat compiler). */
const Vue = await import('vue');
win.Vue = Vue;
setGlobal('Vue', Vue);
if (!win.Vue) {
  console.error('Vue gagal dimuat');
  process.exit(1);
}

new Function(readFileSync('dist/app.js', 'utf8'))();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(900);

const app = doc.getElementById('app');
const text = () => (app.textContent || '').replace(/\s+/g, ' ').trim();

const checks = [];
checks.push(['mount', !!app && app.children.length > 0]);
checks.push(['greeting', /Assalamualaikum/i.test(text())]);
checks.push(['jadwal', /\d{2}:\d{2}/.test(text())]);

const routes = [
  ['sholat', ['Jadwal sholat', 'Sholat sunnah', 'Qadha']],
  ['quran', ['Progres tilawah', 'Hafalan']],
  ['dzikir', ['Ketuk lingkaran']],
  ['laporan', ['Laporan amal', 'Laporan bulanan']],
  ['kalender', ['Kalender hijriah', 'Hari besar']],
  ['ramadhan', ['Imsakiyah', 'Ramadhan']],
  ['keluarga', ['Grup keluarga', 'Undang', 'Anggota']],
  ['target', ['Target bersama', 'Misi hafalan', 'Buat target']],
  ['pengaturan', ['Simpan pengaturan']]
];

for (const [route, needles] of routes) {
  win.location.hash = '#/' + route;
  win.dispatchEvent(new win.Event('hashchange'));
  await wait(650);
  const view = text().toLowerCase();
  checks.push([route, needles.every((n) => view.includes(n.toLowerCase()))]);
  if (route === 'laporan') {
    checks.push(['charts', app.querySelectorAll('svg[data-chart]').length >= 3]);
    checks.push(['monthly-card', app.querySelectorAll('canvas').length > 0]);
    checks.push(['share-buttons', view.includes('unduh png') && view.includes('salin teks') && view.includes('cetak/pdf')]);
    checks.push(['card-style-controls', view.includes('palet') && view.includes('tampilkan nama') && view.includes('zamrud')]);
    checks.push(['print-block', app.querySelectorAll('.print-report').length === 1]);
  }
  if (route === 'kalender') {
    checks.push(['kalender-grid', app.querySelectorAll('main button').length >= 30]);
  }
  if (route === 'target') {
    checks.push(['target-checklist', app.querySelectorAll('button[aria-pressed]').length >= 4]);
  }
}

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}

if (errors.length) {
  console.error('\nError runtime:');
  errors.forEach((e) => console.error(' - ' + e));
}

console.log(`\n${checks.length - failed}/${checks.length} cek lolos · ${errors.length} error runtime`);
process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
