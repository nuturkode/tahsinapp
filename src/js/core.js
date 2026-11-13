/**
 * Core IbadahKu — state global, transport (Apps Script / mock), util tanggal,
 * router hash, tema, dan helper UI (SweetAlert2, flatpickr, ApexCharts).
 */
const Vue = window.Vue;
export const { reactive, ref, computed, watch, onMounted, onUnmounted, nextTick, h } = Vue;

/* ------------------------------------------------------------------ state */
export const state = reactive({
  ready: false,
  loading: 0,
  route: 'beranda',
  profile: null,
  today: null,
  marks: {},
  streak: 0,
  quran: null,
  dhikr: null,
  sunnah: {},
  qadha: [],
  hafalan: { items: [], dueCount: 0, total: 0 },
  stats: null,
  cities: [],
  citiesLoaded: false,
  demo: false,
  error: ''
});

export const busy = computed(() => state.loading > 0);

/** Terapkan respons bootstrap ke state global (dipakai saat boot & refresh). */
export function applyBootstrap(data) {
  if (!data) return;
  state.profile = data.profile || state.profile;
  state.today = data.today || state.today;
  state.marks = data.marks || {};
  state.streak = Number(data.streak) || 0;
  state.quran = data.quran || state.quran;
  state.dhikr = data.dhikr || state.dhikr;
  state.sunnah = data.sunnah || state.sunnah;
  state.qadha = data.qadha || state.qadha;
  state.hafalan = data.hafalan || state.hafalan;
  state.stats = data.stats || state.stats;
  state.demo = Boolean(data.demo);
  state.ready = true;
}

/* -------------------------------------------------------------- transport */
function gasRunner() {
  const g = window.google;
  return g && g.script && g.script.run ? g.script.run : null;
}

function gasCall(action, payload) {
  return new Promise((resolve, reject) => {
    gasRunner()
      .withSuccessHandler((raw) => {
        let out;
        try {
          out = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (err) {
          reject({ code: 'PARSE', message: 'Respons server tidak valid.' });
          return;
        }
        out && out.ok ? resolve(out.data) : reject((out && out.error) || { code: 'ERR', message: 'Permintaan gagal.' });
      })
      .withFailureHandler((err) =>
        reject({ code: 'NETWORK', message: (err && err.message) || 'Koneksi ke server gagal. Coba lagi.' })
      )
      .api(action, JSON.stringify(payload || {}));
  });
}

let mockHandler = null;
async function mockCall(action, payload) {
  if (!mockHandler) {
    const mod = await import('./mock.js');
    mockHandler = mod.mockApi;
  }
  return mockHandler(action, payload);
}

export async function api(action, payload = {}) {
  state.loading++;
  try {
    return gasRunner() ? await gasCall(action, payload) : await mockCall(action, payload);
  } finally {
    state.loading = Math.max(0, state.loading - 1);
  }
}

/* ------------------------------------------------------------------ waktu */
export const pad2 = (n) => String(n).padStart(2, '0');

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function isoOfDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseISO(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function addDaysISO(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoOfDate(d);
}

export function dayOfYear(iso) {
  const d = parseISO(iso);
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}

export function timeToMinutes(t) {
  const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToClock(total) {
  const t = ((total % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
}

export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function formatCountdown(seconds) {
  const t = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export const PRAYERS = [
  { key: 'subuh', label: 'Subuh', icon: 'wb_twilight' },
  { key: 'dzuhur', label: 'Dzuhur', icon: 'wb_sunny' },
  { key: 'ashar', label: 'Ashar', icon: 'flare' },
  { key: 'maghrib', label: 'Maghrib', icon: 'wb_twilight' },
  { key: 'isya', label: 'Isya', icon: 'nights_stay' }
];

export const STATUS = [
  { value: 'jamaah', label: 'Jamaah', icon: 'groups', color: 'text-brand' },
  { value: 'tepat', label: 'Tepat waktu', icon: 'check_circle', color: 'text-brand' },
  { value: 'qadha', label: 'Qadha', icon: 'history', color: 'text-gold' },
  { value: '', label: 'Belum', icon: 'radio_button_unchecked', color: 'text-muted' }
];

export function statusMeta(value) {
  return STATUS.find((s) => s.value === (value || '')) || STATUS[3];
}

export function dayScore(marks) {
  return PRAYERS.filter((p) => marks && marks[p.key]).length;
}

/** Sholat berikutnya + hitung mundur presisi detik. */
export function nextPrayer(schedule, now = new Date()) {
  if (!schedule) return { key: 'subuh', name: 'Subuh', time: '--:--', secondsLeft: 0, prev: null, progress: 0 };
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const list = PRAYERS.map((p) => ({
    key: p.key,
    name: p.label,
    time: schedule[p.key] || '--:--',
    sec: timeToMinutes(schedule[p.key]) * 60
  }));
  const upcoming = list.find((p) => p.sec > nowSec);
  const target = upcoming || { ...list[0], sec: list[0].sec + 86400, tomorrow: true };
  const before = list.filter((p) => p.sec <= nowSec);
  const prev = before.length ? before[before.length - 1] : list[list.length - 1];
  const span = Math.max(1, target.sec - prev.sec);
  const elapsed = Math.max(0, nowSec - prev.sec);
  return {
    key: target.key,
    name: target.name,
    time: target.time,
    secondsLeft: Math.max(0, target.sec - nowSec),
    tomorrow: Boolean(target.tomorrow),
    prev: prev.name,
    progress: Math.min(100, Math.max(0, (elapsed / span) * 100))
  };
}

/* ------------------------------------------------------------- hijriah */
export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabiul Awal',
  'Rabiul Akhir',
  'Jumadil Awal',
  'Jumadil Akhir',
  'Rajab',
  "Sya'ban",
  'Ramadhan',
  'Syawal',
  "Dzulqa'dah",
  'Dzulhijjah'
];

/** Konversi Gregorian → Hijriah (algoritma Kuwaiti, akurasi ±1 hari). */
export function gregToHijri(gy, gm, gd) {
  let jd =
    Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4) +
    Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4) +
    gd -
    32075;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const m = Math.floor((24 * l) / 709);
  const d = l - Math.floor((709 * m) / 24);
  const y = 30 * n + j - 30;
  return { y, m, d };
}

export function hijriFor(iso, adj = 0) {
  const shifted = Number(adj) ? addDaysISO(iso, Number(adj)) : iso;
  const date = parseISO(shifted);
  const g = gregToHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const monthName = HIJRI_MONTHS[(g.m - 1 + 12) % 12];
  return { day: g.d, month: g.m, year: g.y, monthName, label: `${g.d} ${monthName} ${g.y} H` };
}

/* ------------------------------------------------------------- format */
export function fmtNum(n) {
  return new Intl.NumberFormat('id-ID').format(Number(n) || 0);
}

export function fmtDate(iso) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseISO(iso));
}

export function fmtDateShort(iso) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(parseISO(iso));
}

export function fmtWeekday(iso) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parseISO(iso));
}

export function pct(part, total) {
  if (!total) return 0;
  return Math.round((Number(part) / Number(total)) * 100);
}

/* ------------------------------------------------------------- router */
export const ROUTES = [
  'beranda',
  'sholat',
  'quran',
  'dzikir',
  'laporan',
  'kalender',
  'ramadhan',
  'keluarga',
  'target',
  'pengaturan'
];

export function navigate(name) {
  if (!ROUTES.includes(name)) name = 'beranda';
  if (window.location.hash !== `#/${name}`) window.location.hash = `#/${name}`;
  else state.route = name;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initRouter() {
  const sync = () => {
    const name = String(window.location.hash || '').replace(/^#\/?/, '') || 'beranda';
    state.route = ROUTES.includes(name) ? name : 'beranda';
  };
  window.addEventListener('hashchange', sync);
  sync();
}

/* ------------------------------------------------------------- tema */
export const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export function applyTheme(mode) {
  const dark = mode === 'dark' || (mode !== 'light' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#071c17' : '#0B3B33');
  return dark;
}

/* ------------------------------------------------------------- UI helper */
export function toast(title, icon = 'success') {
  if (!window.Swal) return;
  window.Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 1900,
    timerProgressBar: true,
    customClass: { popup: 'rounded-xl text-sm' }
  });
}

export function alertError(err) {
  const message = (err && (err.message || err.code)) || 'Terjadi kesalahan.';
  if (!window.Swal) {
    state.error = message;
    return;
  }
  window.Swal.fire({
    icon: 'error',
    title: 'Ups, gagal',
    text: message,
    confirmButtonText: 'Tutup',
    confirmButtonColor: '#0E7C66',
    customClass: { popup: 'rounded-2xl' }
  });
}

export async function confirmAction({ title, text, confirm = 'Ya, lanjutkan', danger = false }) {
  if (!window.Swal) return window.confirm(`${title}\n${text || ''}`);
  const res = await window.Swal.fire({
    icon: danger ? 'warning' : 'question',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirm,
    cancelButtonText: 'Batal',
    confirmButtonColor: danger ? '#b91c1c' : '#0E7C66',
    cancelButtonColor: '#94a3b8',
    customClass: { popup: 'rounded-2xl' }
  });
  return res.isConfirmed;
}

export function initFlatpickr(el, opts = {}) {
  if (!el || !window.flatpickr) return null;
  return window.flatpickr(el, {
    locale: 'id',
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'j F Y',
    disableMobile: true,
    ...opts
  });
}

export function renderChart(el, options) {
  if (!el || !window.ApexCharts) return null;
  const chart = new window.ApexCharts(el, options);
  chart.render();
  return chart;
}

export const chartBase = (dark) => ({
  chart: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    foreColor: dark ? '#a8bdb5' : '#6b7a74',
    toolbar: { show: false },
    animations: { speed: 320 }
  },
  grid: { borderColor: dark ? '#174438' : '#E8E5DC', strokeDashArray: 4 },
  tooltip: { theme: dark ? 'dark' : 'light' },
  colors: ['#0E7C66', '#C9A227', '#2A9D8F', '#94a3b8']
});

export function downloadCSV(filename, csv) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const SURAH_NAMES =
  "Al-Fatihah|Al-Baqarah|Ali 'Imran|An-Nisa'|Al-Ma'idah|Al-An'am|Al-A'raf|Al-Anfal|At-Taubah|Yunus|Hud|Yusuf|Ar-Ra'd|Ibrahim|Al-Hijr|An-Nahl|Al-Isra'|Al-Kahf|Maryam|Ta-Ha|Al-Anbiya|Al-Hajj|Al-Mu'minun|An-Nur|Al-Furqan|Asy-Syu'ara'|An-Naml|Al-Qasas|Al-'Ankabut|Ar-Rum|Luqman|As-Sajdah|Al-Ahzab|Saba'|Fatir|Ya-Sin|As-Saffat|Sad|Az-Zumar|Ghafir|Fussilat|Asy-Syura|Az-Zukhruf|Ad-Dukhan|Al-Jasiyah|Al-Ahqaf|Muhammad|Al-Fath|Al-Hujurat|Qaf|Az-Zariyat|At-Tur|An-Najm|Al-Qamar|Ar-Rahman|Al-Waqi'ah|Al-Hadid|Al-Mujadilah|Al-Hasyr|Al-Mumtahanah|As-Saff|Al-Jumu'ah|Al-Munafiqun|At-Tagabun|At-Talaq|At-Tahrim|Al-Mulk|Al-Qalam|Al-Haqqah|Al-Ma'arij|Nuh|Al-Jinn|Al-Muzzammil|Al-Muddassir|Al-Qiyamah|Al-Insan|Al-Mursalat|An-Naba'|An-Nazi'at|'Abasa|At-Takwir|Al-Infitar|Al-Mutaffifin|Al-Insyiqaq|Al-Buruj|At-Tariq|Al-A'la|Al-Gasyiyah|Al-Fajr|Al-Balad|Asy-Syams|Al-Lail|Ad-Duha|Asy-Syarh|At-Tin|Al-'Alaq|Al-Qadr|Al-Bayyinah|Az-Zalzalah|Al-'Adiyat|Al-Qari'ah|At-Takasur|Al-'Asr|Al-Humazah|Al-Fil|Quraisy|Al-Ma'un|Al-Kausar|Al-Kafirun|An-Nasr|Al-Lahab|Al-Ikhlas|Al-Falaq|An-Nas".split(
    '|'
  );

export const SURAHS = SURAH_NAMES.map((nama, i) => ({ nomor: i + 1, nama }));

/* --------------------------------------------------------- amalan (Fase 2) */

export const SUNNAH_TYPES = [
  { key: 'rawatib', label: 'Rawatib', target: 12, note: '12 rakaat mengiringi fardhu' },
  { key: 'dhuha', label: 'Dhuha', target: 2, note: '2–12 rakaat, waktu naik matahari' },
  { key: 'tahajud', label: 'Tahajud', target: 2, note: 'sepertiga malam terakhir' },
  { key: 'witir', label: 'Witir', target: 3, note: 'penutup sholat malam' }
];

export const QADHA_KINDS = [
  { key: 'subuh', label: 'Subuh' },
  { key: 'dzuhur', label: 'Dzuhur' },
  { key: 'ashar', label: 'Ashar' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isya', label: 'Isya' },
  { key: 'puasa', label: 'Puasa' }
];

/** Jarak ulang murojaah (hari) — bertingkat seperti pengulangan berjarak. */
export const HAFALAN_INTERVALS = [1, 3, 7, 14, 30];

export const HIJRI_EVENTS = {
  '1-1': 'Tahun Baru Hijriah',
  '1-10': 'Hari Asyura',
  '3-12': 'Maulid Nabi Muhammad ﷺ',
  '7-27': "Isra Mi'raj",
  '8-15': "Nisfu Sya'ban",
  '9-1': 'Awal Ramadhan',
  '9-17': "Nuzulul Qur'an",
  '10-1': 'Idul Fitri',
  '12-9': 'Hari Arafah',
  '12-10': 'Idul Adha',
  '12-11': 'Hari Tasyrik',
  '12-12': 'Hari Tasyrik',
  '12-13': 'Hari Tasyrik'
};

/** Hari yang dilarang berpuasa (Idul Fitri, Idul Adha, hari Tasyrik). */
export const HARAM_FASTING = { '10-1': 1, '12-10': 1, '12-11': 1, '12-12': 1, '12-13': 1 };

export function hijriEvent(month, day) {
  return HIJRI_EVENTS[`${month}-${day}`] || '';
}

/** Jenis puasa sunnah yang disarankan pada tanggal hijriah tertentu. */
/** Palet kartu laporan: gradien (gelap/terang) + aksen kontras untuk masing-masing tema. */
export const CARD_PALETTES = [
  {
    key: 'emerald',
    label: 'Zamrud',
    dark: ['#0B3B33', '#0E7C66', '#093029'],
    light: ['#F4FAF7', '#E7F3EF', '#FDFCF9'],
    accentDark: '#C9A227',
    accentLight: '#0E7C66'
  },
  {
    key: 'gold',
    label: 'Madinah',
    dark: ['#2A2411', '#6B5518', '#1C180A'],
    light: ['#FDF8E8', '#F7EBC5', '#FEFCF4'],
    accentDark: '#E9C46A',
    accentLight: '#8A6D10'
  },
  {
    key: 'ocean',
    label: 'Samudra',
    dark: ['#0A2436', '#125E7A', '#081C2A'],
    light: ['#F1F8FB', '#DCEEF5', '#FBFDFE'],
    accentDark: '#E9C46A',
    accentLight: '#125E7A'
  },
  {
    key: 'rose',
    label: 'Senja',
    dark: ['#331B22', '#7A3B45', '#241217'],
    light: ['#FDF4F5', '#F7E1E4', '#FFFBFC'],
    accentDark: '#F2C9A0',
    accentLight: '#A13B4A'
  },
  {
    key: 'ink',
    label: 'Monokrom',
    dark: ['#111614', '#2E3A35', '#0A0E0C'],
    light: ['#F7F7F5', '#E8E8E4', '#FFFFFF'],
    accentDark: '#C9A227',
    accentLight: '#2E3A35'
  }
];

export function cardPalette(key) {
  return CARD_PALETTES.find((palette) => palette.key === key) || CARD_PALETTES[0];
}

export const FAMILY_LIMIT = 5;
export const TARGET_LIMIT = 12;
export const TARGET_MISSION_LIMIT = 20;

export const TADARUS_TOTAL_PAGES = 604;
export const RAMADHAN_DAYS = 30;

/** Info Ramadhan untuk sebuah tanggal: sedang Ramadhan, hari ke-berapa, atau berapa hari lagi. */
export function ramadhanMeta(iso, adj = 0) {
  const hijri = hijriFor(iso, adj);
  const isRamadhan = hijri.month === 9;
  let daysToRamadhan = 0;
  let nextYear = hijri.year;
  if (!isRamadhan) {
    for (let i = 1; i <= 400; i++) {
      const h = hijriFor(addDaysISO(iso, i), adj);
      if (h.month === 9 && h.day === 1) {
        daysToRamadhan = i;
        nextYear = h.year;
        break;
      }
    }
  }
  return {
    hijri,
    isRamadhan,
    dayOfRamadhan: isRamadhan ? hijri.day : 0,
    daysToRamadhan,
    nextYear,
    dailyTarget: Math.ceil(TADARUS_TOTAL_PAGES / RAMADHAN_DAYS)
  };
}

/** Detik menuju jam tertentu (HH:MM) hari ini; bila lewat, dihitung ke besok. */
export function countdownTo(hhmm, now = new Date()) {
  const target = timeToMinutes(hhmm) * 60;
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const diff = target - nowSec;
  return diff >= 0 ? diff : diff + 86400;
}

export function fmtRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

export function fastingForHijri(hijri, weekdayIndex) {
  const key = `${hijri.month}-${hijri.day}`;
  if (HARAM_FASTING[key]) return null;
  if (hijri.month === 12 && hijri.day === 9) return { type: 'arafah', label: 'Puasa Arafah' };
  if (hijri.month === 1 && hijri.day === 10) return { type: 'asyura', label: 'Puasa Asyura' };
  if (hijri.day === 13 || hijri.day === 14 || hijri.day === 15) return { type: 'ayyamul-bidh', label: 'Ayyamul Bidh' };
  if (weekdayIndex === 1 || weekdayIndex === 4) return { type: 'senin-kamis', label: 'Puasa Senin/Kamis' };
  return null;
}
