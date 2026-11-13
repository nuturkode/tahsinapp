/** Konstanta dan utilitas umum. */

var APP = { name: 'IbadahKu', version: '0.1.0', tz: 'Asia/Jakarta' };
var PRAYER_KEYS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
var STATUS_VALUES = ['jamaah', 'tepat', 'qadha'];
var QURAN_MODES = ['tilawah', 'hafalan', 'murojaah'];
var HIJRI_MONTHS = [
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

function nowIso_() {
  return Utilities.formatDate(new Date(), APP.tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function todayISO_() {
  return Utilities.formatDate(new Date(), APP.tz, 'yyyy-MM-dd');
}

function isoOf_(date) {
  return Utilities.formatDate(date, APP.tz, 'yyyy-MM-dd');
}

function parseISO_(iso) {
  var parts = String(iso || '').split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
}

function addDaysISO_(iso, days) {
  var date = parseISO_(iso);
  date.setDate(date.getDate() + Number(days));
  return isoOf_(date);
}

function pad2_(value) {
  return String(value).length < 2 ? '0' + value : String(value);
}

function clamp_(value, min, max, fallback) {
  var n = Number(value);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clean_(value, maxLength) {
  return String(value == null ? '' : value).slice(0, maxLength || 300);
}

function userError_(code, message) {
  var err = new Error(message);
  err.code = code;
  err.isUserError = true;
  return err;
}

function emailId_(email) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(email));
  var hex = '';
  for (var i = 0; i < digest.length; i++) {
    var b = (digest[i] & 0xff) + 0x100;
    hex += b.toString(16).slice(1);
  }
  return hex.slice(0, 24);
}

/** Gregorian → Hijriah (algoritma Kuwaiti, akurasi ±1 hari). */
function hijriFromISO_(iso, adjustment) {
  var adjusted = Number(adjustment) ? addDaysISO_(iso, Number(adjustment)) : iso;
  var d = parseISO_(adjusted);
  var gy = d.getFullYear();
  var gm = d.getMonth() + 1;
  var gd = d.getDate();

  var jd =
    Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4) +
    Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4) +
    gd -
    32075;

  var l = jd - 1948440 + 10632;
  var n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  var j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  var month = Math.floor((24 * l) / 709);
  var day = l - Math.floor((709 * month) / 24);
  var year = 30 * n + j - 30;
  var monthName = HIJRI_MONTHS[(month - 1 + 12) % 12];

  return { day: day, month: month, year: year, monthName: monthName, label: day + ' ' + monthName + ' ' + year + ' H' };
}

function serverMeta_(ms) {
  return { serverNow: nowIso_(), ms: ms || 0, version: APP.version };
}

function envelope_(data, ms) {
  return JSON.stringify({ ok: true, data: data || {}, meta: serverMeta_(ms) });
}

function failEnvelope_(code, message, ms) {
  return JSON.stringify({ ok: false, error: { code: code, message: message }, meta: serverMeta_(ms) });
}
