/**
 * Mock backend untuk preview lokal (tanpa Apps Script).
 * Bentuk respons identik dengan Router.gs, sehingga frontend tidak perlu diubah.
 * Data disimpan di localStorage dan deterministik (seed per tanggal).
 */
import {
  PRAYERS,
  SURAHS,
  SUNNAH_TYPES,
  QADHA_KINDS,
  HAFALAN_INTERVALS,
  addDaysISO,
  dayScore,
  dayOfYear,
  hijriFor,
  hijriEvent,
  fastingForHijri,
  ramadhanMeta,
  parseISO,
  timeToMinutes,
  todayISO,
  minutesToClock,
  pad2
} from './core.js';

const KEY = 'ibadahku:demo:v1';

export const CITIES = [
  { id: '1301', name: 'KOTA JAKARTA', offset: 0 },
  { id: '1219', name: 'KOTA BANDUNG', offset: -4 },
  { id: '1427', name: 'KOTA SEMARANG', offset: -12 },
  { id: '1481', name: 'KOTA YOGYAKARTA', offset: -8 },
  { id: '1638', name: 'KOTA SURABAYA', offset: -25 },
  { id: '1639', name: 'KOTA MALANG', offset: -28 },
  { id: '1108', name: 'KOTA MEDAN', offset: +38 },
  { id: '1111', name: 'KOTA PALEMBANG', offset: +12 },
  { id: '1701', name: 'KOTA MAKASSAR', offset: +8 },
  { id: '1609', name: 'KOTA DENPASAR', offset: -18 },
  { id: '1901', name: 'KOTA BANJARMASIN', offset: +8 },
  { id: '1374', name: 'KOTA PADANG', offset: +18 },
  { id: '1401', name: 'KOTA PEKANBARU', offset: +25 },
  { id: '1801', name: 'KOTA BALIKPAPAN', offset: +6 }
];

const BASE = { imsak: '03:58', subuh: '04:08', syuruq: '05:23', dhuha: '05:51', dzuhur: '11:40', ashar: '14:56', maghrib: '17:50', isya: '19:01' };

/* --------------------------------------------------------------- deterministic rand */
function rand(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/* ------------------------------------------------------------------- schedule */
function scheduleFor(iso, cityId, offsetMenit = 0) {
  const city = CITIES.find((c) => c.id === String(cityId)) || CITIES[0];
  const doy = dayOfYear(iso);
  const seasonal = Math.round(17 * Math.cos(((doy - 20) / 365) * 2 * Math.PI));
  const shift = seasonal + city.offset + Number(offsetMenit || 0);
  const out = {};
  Object.keys(BASE).forEach((key) => {
    const base = timeToMinutes(BASE[key]);
    const factor = key === 'dzuhur' ? 0.25 : 1;
    out[key] = minutesToClock(base + Math.round(shift * factor));
  });
  return out;
}

function dayEntry(iso, cityId, offsetMenit) {
  return { date: iso, ...scheduleFor(iso, cityId, offsetMenit) };
}

/* ------------------------------------------------------------------- seed */
function defaultProfile() {
  return {
    nama: 'Fulan',
    cityId: '1301',
    cityName: 'KOTA JAKARTA',
    offsetMenit: 0,
    hijriAdj: 0,
    targetTilawah: 4,
    targetDzikir: 33,
    theme: 'light',
    notifChannel: 'calendar'
  };
}

const PROB = { subuh: 0.7, dzuhur: 0.92, ashar: 0.74, maghrib: 0.95, isya: 0.86 };

function seedMarks(today) {
  const marks = {};
  for (let i = 59; i >= 0; i--) {
    const iso = addDaysISO(today, -i);
    const day = {};
    PRAYERS.forEach((p) => {
      const r = rand(iso + p.key);
      if (r < PROB[p.key] * 0.62) day[p.key] = 'jamaah';
      else if (r < PROB[p.key]) day[p.key] = 'tepat';
      else if (r < PROB[p.key] + 0.09) day[p.key] = 'qadha';
    });
    marks[iso] = day;
  }
  return marks;
}

function seedQuran(today) {
  const logs = [];
  for (let i = 44; i >= 1; i--) {
    const iso = addDaysISO(today, -i);
    if (rand('q' + iso) > 0.55) {
      const surahIndex = Math.floor(rand('s' + iso) * 30);
      logs.push({
        date: iso,
        surah: SURAHS[surahIndex].nama,
        ayahFrom: 1,
        ayahTo: 20,
        pages: 2 + Math.floor(rand('p' + iso) * 5),
        mode: rand('m' + iso) > 0.75 ? 'hafalan' : 'tilawah'
      });
    }
  }
  return logs;
}

function seedSunnah(today) {
  const counts = {};
  SUNNAH_TYPES.forEach((t) => {
    const r = rand('sunnah' + today + t.key);
    counts[t.key] = r > 0.55 ? Math.round(r * t.target) : 0;
  });
  return { [today]: counts };
}

function seedQadha() {
  return { subuh: 8, dzuhur: 3, ashar: 5, maghrib: 1, isya: 4, puasa: 6 };
}

function seedHafalan(today) {
  const rows = [
    { surah: 'Al-Baqarah', ayahFrom: 1, ayahTo: 5, score: 4, intervalIndex: 3 },
    { surah: 'Al-Kahf', ayahFrom: 1, ayahTo: 10, score: 5, intervalIndex: 4 },
    { surah: "Ya-Sin", ayahFrom: 1, ayahTo: 12, score: 3, intervalIndex: 1 },
    { surah: 'Ar-Rahman', ayahFrom: 1, ayahTo: 13, score: 2, intervalIndex: 0 },
    { surah: 'Al-Mulk', ayahFrom: 1, ayahTo: 30, score: 5, intervalIndex: 2 }
  ];
  return rows.map((row, i) => ({
    id: 'hafalan-' + (i + 1),
    ...row,
    nextReview: addDaysISO(today, i === 1 ? 6 : i === 4 ? 12 : -1 * (i + 1)),
    status: row.score >= 4 ? 'lancar' : 'murojaah',
    createdAt: addDaysISO(today, -20 + i)
  }));
}

function seedFamily(today) {
  return [
    {
      id: 'fam-1',
      ownerId: 'demo',
      memberEmail: 'aisyah@example.com',
      memberId: 'm-aisyah',
      memberName: 'Aisyah',
      status: 'active',
      createdAt: addDaysISO(today, -42),
      updatedAt: addDaysISO(today, -42)
    },
    {
      id: 'fam-2',
      ownerId: 'demo',
      memberEmail: 'yusuf@example.com',
      memberId: 'm-yusuf',
      memberName: 'Yusuf',
      status: 'active',
      createdAt: addDaysISO(today, -18),
      updatedAt: addDaysISO(today, -18)
    },
    {
      id: 'fam-3',
      ownerId: 'demo',
      memberEmail: 'fatimah@example.com',
      memberId: 'm-fatimah',
      memberName: 'Fatimah',
      status: 'pending',
      createdAt: addDaysISO(today, -2),
      updatedAt: addDaysISO(today, -2)
    }
  ];
}

function seedTargets(today) {
  return [
    {
      id: 'tgt-1',
      ownerId: 'demo',
      memberId: 'm-aisyah',
      memberName: 'Aisyah',
      title: 'Hafal QS. Al-Mulk 1–15',
      note: 'Satu ayat sehari setelah maghrib.',
      dueDate: addDaysISO(today, 21),
      status: 'active',
      createdAt: addDaysISO(today, -12),
      missions: [
        { id: 'ms-1', label: 'Ayat 1–5 lancar tanpa melihat', done: true, doneBy: 'm-aisyah', doneAt: addDaysISO(today, -8) },
        { id: 'ms-2', label: 'Ayat 6–10 lancar', done: true, doneBy: 'm-aisyah', doneAt: addDaysISO(today, -4) },
        { id: 'ms-3', label: 'Ayat 11–15 lancar', done: false, doneBy: '', doneAt: '' },
        { id: 'ms-4', label: 'Setor murojaah 1–15 ke pendamping', done: false, doneBy: '', doneAt: '' }
      ]
    },
    {
      id: 'tgt-2',
      ownerId: 'demo',
      memberId: 'm-yusuf',
      memberName: 'Yusuf',
      title: 'Murojaah Juz 30 (An-Naba–An-Nas)',
      note: 'Dicek setiap Sabtu pagi.',
      dueDate: addDaysISO(today, 9),
      status: 'active',
      createdAt: addDaysISO(today, -20),
      missions: [
        { id: 'ms-5', label: 'An-Naba–An-Nazi’at', done: true, doneBy: 'demo', doneAt: addDaysISO(today, -14) },
        { id: 'ms-6', label: '‘Abasa–At-Takwir', done: true, doneBy: 'm-yusuf', doneAt: addDaysISO(today, -9) },
        { id: 'ms-7', label: 'Al-Infitar–Al-Insyiqaq', done: true, doneBy: 'm-yusuf', doneAt: addDaysISO(today, -5) },
        { id: 'ms-8', label: 'Al-Buruj–Al-Gasyiyah', done: false, doneBy: '', doneAt: '' },
        { id: 'ms-9', label: 'Al-Fajr–An-Nas', done: false, doneBy: '', doneAt: '' }
      ]
    },
    {
      id: 'tgt-3',
      ownerId: 'demo',
      memberId: 'demo',
      memberName: 'Saya sendiri',
      title: 'Tilawah satu juz per pekan',
      note: '',
      dueDate: addDaysISO(today, 30),
      status: 'active',
      createdAt: addDaysISO(today, -3),
      missions: [
        { id: 'ms-10', label: 'Juz 1 selesai', done: true, doneBy: 'demo', doneAt: addDaysISO(today, -1) },
        { id: 'ms-11', label: 'Juz 2 selesai', done: false, doneBy: '', doneAt: '' },
        { id: 'ms-12', label: 'Juz 3 selesai', done: false, doneBy: '', doneAt: '' }
      ]
    }
  ];
}

function targetDoneLabel(db, ownerId, doneBy) {
  if (!doneBy) return '';
  if (doneBy === ownerId) return 'Pendamping';
  const row = (db.family || []).find((item) => item.memberId === doneBy);
  return (row && row.memberName) || 'Anggota';
}

function targetPayload(db) {
  const targets = (db.targets || [])
    .filter((row) => row.status !== 'archived')
    .map((row) => {
      const missions = (row.missions || []).map((mission) => ({
        ...mission,
        done: Boolean(mission.done),
        doneBy: targetDoneLabel(db, row.ownerId, mission.doneBy),
        doneAt: mission.doneAt || ''
      }));
      const done = missions.filter((mission) => mission.done).length;
      const total = missions.length;
      return {
        id: row.id,
        title: row.title,
        note: row.note || '',
        dueDate: row.dueDate || '',
        role: 'owner',
        ownerName: (db.profile && db.profile.nama) || 'Anda',
        memberName: row.memberId === 'demo' ? 'Saya sendiri' : row.memberName,
        forSelf: row.memberId === 'demo',
        missions,
        done,
        total,
        percent: total ? Math.round((done / total) * 100) : 0,
        complete: total > 0 && done === total,
        canRemove: true
      };
    });

  targets.sort(
    (a, b) =>
      Number(a.complete) - Number(b.complete) ||
      String(a.dueDate || '9999-12-31').localeCompare(String(b.dueDate || '9999-12-31'))
  );

  const members = (db.family || [])
    .filter((row) => row.ownerId === 'demo' && row.status === 'active')
    .map((row) => ({ id: row.id, name: row.memberName, email: maskEmail(row.memberEmail) }));

  return { targets, members, maxTargets: 12, maxMissions: 20 };
}

function maskEmail(email) {
  const value = String(email || '');
  const at = value.indexOf('@');
  if (at < 1) return value || '—';
  return value.slice(0, 1) + '***' + value.slice(at);
}

function memberStats(memberId) {
  const r = (key) => rand(memberId + key);
  const percent7 = 55 + Math.round(r('p') * 40);
  const percent30 = 50 + Math.round(r('p30') * 45);
  const streak = Math.round(r('s') * 14);
  const quran7 = Math.round(r('q') * 40);
  const dhikr7 = Math.round(r('d') * 300);
  const heatmap = [];
  for (let i = 13; i >= 0; i--) {
    const date = addDaysISO(todayISO(), -i);
    heatmap.push({ date, score: Math.round(rand(memberId + date) * 5) });
  }
  return {
    percent7,
    percent30,
    streak,
    quran7,
    dhikr7,
    done7: Math.round((percent7 / 100) * 35),
    total7: 35,
    heatmap,
    lastSeen: `${Math.round(r('l') * 20) + 1} jam lalu`
  };
}

function familyPayload(db) {
  const rows = db.family || [];
  const members = [];
  const outgoing = [];
  const incoming = [];
  const myEmail = maskEmail((db.profile && db.profile.email) || 'demo@ibadahku.app');

  rows.forEach((row) => {
    if (row.ownerId === 'demo' && row.status === 'active') {
      const stats = memberStats(row.memberId);
      members.push({
        id: row.id,
        name: row.memberName,
        email: maskEmail(row.memberEmail),
        since: row.updatedAt || row.createdAt,
        percent7: stats.percent7,
        streak: stats.streak,
        quran7: stats.quran7
      });
    } else if (row.ownerId === 'demo' && row.status === 'pending') {
      outgoing.push({ id: row.id, email: maskEmail(row.memberEmail), createdAt: row.createdAt });
    } else if (row.memberEmail === 'demo@ibadahku.app' && row.status === 'pending') {
      incoming.push({ id: row.id, ownerName: 'Pengundang', createdAt: row.createdAt });
    }
  });

  return { members, outgoing, incoming, maxMembers: 5, myEmail };
}

function lastRamadhanStart(today) {
  for (let i = 0; i <= 400; i++) {
    const iso = addDaysISO(today, -i);
    const h = hijriFor(iso);
    if (h.month === 9 && h.day === 1) return { start: iso, year: h.year };
  }
  return null;
}

function seedRamadhan(today) {
  const found = lastRamadhanStart(today);
  const out = {};
  if (!found) return out;
  for (let d = 0; d < 10; d++) {
    const iso = addDaysISO(found.start, d);
    const r = rand('ramadhan' + iso);
    out[iso] = {
      tarawihRakaat: r > 0.2 ? (r > 0.6 ? 20 : 11) : 0,
      tadarusPages: Math.round(r * 12),
      itikaf: d >= 8 && r > 0.5,
      sedekah: r > 0.4 ? Math.round(r * 10) * 5000 : 0,
      zakatPaid: false,
      zakatAmount: 45000,
      note: ''
    };
  }
  return out;
}

function load() {
  const today = todayISO();
  let raw = null;
  try {
    raw = JSON.parse(window.localStorage.getItem(KEY) || 'null');
  } catch (e) {
    raw = null;
  }
  if (!raw || raw.version !== 1) {
    raw = {
      version: 1,
      profile: defaultProfile(),
      marks: seedMarks(today),
      quran: seedQuran(today),
      dhikr: {},
      journal: {},
      sunnah: seedSunnah(today),
      qadha: seedQadha(),
      hafalan: seedHafalan(today),
      ramadhan: seedRamadhan(today),
      family: seedFamily(today),
      targets: seedTargets(today)
    };
  }
  raw.dhikr = raw.dhikr || {};
  raw.ramadhan = raw.ramadhan || seedRamadhan(today);
  raw.family = raw.family || seedFamily(today);
  raw.targets = raw.targets || seedTargets(today);
  raw.journal = raw.journal || {};
  raw.sunnah = raw.sunnah || {};
  raw.qadha = raw.qadha || seedQadha();
  raw.hafalan = raw.hafalan || [];
  return raw;
}

function save(db) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    /* mode privat: abaikan */
  }
}

/* ------------------------------------------------------------------- agregat */
function computeStreak(marks) {
  let streak = 0;
  let cursor = todayISO();
  if (dayScore(marks[cursor]) < 5) cursor = addDaysISO(cursor, -1);
  while (dayScore(marks[cursor]) >= 5) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

function quranSummary(db, profile) {
  const today = todayISO();
  const logs = db.quran || [];
  const todayPages = logs.filter((l) => l.date === today).reduce((a, l) => a + Number(l.pages || 0), 0);
  const totalPages = logs.reduce((a, l) => a + Number(l.pages || 0), 0);
  return {
    todayPages,
    target: Number(profile.targetTilawah) || 4,
    totalPages,
    khatamPct: Math.min(100, Math.round((totalPages / 604) * 100)),
    lastLog: logs.length ? logs[logs.length - 1] : null
  };
}

function dhikrSummary(db, profile) {
  const today = todayISO();
  return { todayCount: Number(db.dhikr[today] || 0), target: Number(profile.targetDzikir) || 33 };
}

function statsSummary(db, profile, days = 30, end = todayISO()) {
  const today = end;
  const from = addDaysISO(today, -(days - 1));
  const heatmap = [];
  const perPrayer = { subuh: 0, dzuhur: 0, ashar: 0, maghrib: 0, isya: 0 };
  const composition = { jamaah: 0, tepat: 0, qadha: 0, kosong: 0 };
  let done = 0;
  for (let i = 0; i < days; i++) {
    const iso = addDaysISO(from, i);
    const day = db.marks[iso] || {};
    heatmap.push({ date: iso, score: dayScore(day) });
    PRAYERS.forEach((p) => {
      const s = day[p.key];
      if (s) {
        done++;
        perPrayer[p.key]++;
        composition[s]++;
      } else composition.kosong++;
    });
  }
  const quranSeries = {};
  (db.quran || []).forEach((l) => {
    if (l.date >= from) quranSeries[l.date] = (quranSeries[l.date] || 0) + Number(l.pages || 0);
  });
  const quran = Object.keys(quranSeries)
    .sort()
    .map((date) => ({ date, pages: quranSeries[date] }));

  return {
    from,
    to: today,
    days,
    percent: Math.round((done / (days * 5)) * 100),
    streak: computeStreak(db.marks),
    totalPrayers: days * 5,
    donePrayers: done,
    heatmap,
    perPrayer,
    quran,
    composition
  };
}

function sunnahCounts(db, date) {
  const raw = db.sunnah[date] || {};
  const out = {};
  SUNNAH_TYPES.forEach((t) => {
    out[t.key] = Number(raw[t.key]) || 0;
  });
  return out;
}

function qadhaList(db) {
  return QADHA_KINDS.map((k) => ({ kind: k.key, label: k.label, remaining: Number(db.qadha[k.key]) || 0 }));
}

function hafalanList(db) {
  const today = todayISO();
  const items = (db.hafalan || []).map((row) => ({
    id: row.id,
    surah: row.surah,
    ayahFrom: row.ayahFrom,
    ayahTo: row.ayahTo,
    score: row.score,
    status: row.status,
    intervalIndex: row.intervalIndex,
    nextReview: row.nextReview,
    due: row.nextReview <= today
  }));
  items.sort((a, b) => (a.nextReview < b.nextReview ? -1 : 1));
  return { items, dueCount: items.filter((i) => i.due).length, total: items.length };
}

function monthlyReport(db, profile, year, month) {
  const from = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const today = todayISO();
  const last = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  const to = last > today ? today : last;
  const days = Number(to.slice(8, 10)) || 0;

  let done = 0;
  let jamaah = 0;
  let tepat = 0;
  let qadha = 0;
  let miss = 0;
  const perPrayerCount = {};
  PRAYERS.forEach((p) => (perPrayerCount[p.key] = 0));

  const heatmap = [];
  let bestDay = null;
  const events = [];

  for (let d = 1; d <= days; d++) {
    const iso = `${year}-${pad2(month)}-${pad2(d)}`;
    const marks = db.marks[iso] || {};
    let score = 0;
    PRAYERS.forEach((p) => {
      const status = marks[p.key];
      if (status) {
        score++;
        done++;
        perPrayerCount[p.key]++;
        if (status === 'jamaah') jamaah++;
        else if (status === 'tepat') tepat++;
        else qadha++;
      } else miss++;
    });
    heatmap.push({ date: iso, score });
    if (!bestDay || score > bestDay.score) bestDay = { date: iso, score };

    const hijri = hijriFor(iso);
    const event = hijriEvent(hijri.month, hijri.day);
    if (event) events.push({ date: iso, name: event });
  }

  const totalSlots = days * 5;
  const perPrayer = PRAYERS.map((p) => ({
    key: p.key,
    label: p.label,
    done: perPrayerCount[p.key],
    percent: days ? Math.round((perPrayerCount[p.key] / days) * 100) : 0
  }));

  let quranPages = 0;
  let quranDays = 0;
  const quranByDate = {};
  (db.quran || []).forEach((log) => {
    if (log.date < from || log.date > to) return;
    quranPages += Number(log.pages) || 0;
    quranByDate[log.date] = true;
  });
  quranDays = Object.keys(quranByDate).length;

  let dhikrTotal = 0;
  Object.keys(db.dhikr || {}).forEach((date) => {
    if (date < from || date > to) return;
    dhikrTotal += Number(db.dhikr[date]) || 0;
  });

  const sunnah = { rawatib: 0, dhuha: 0, tahajud: 0, witir: 0 };
  Object.keys(db.sunnah || {}).forEach((date) => {
    if (date < from || date > to) return;
    const row = db.sunnah[date] || {};
    Object.keys(sunnah).forEach((key) => {
      sunnah[key] += Number(row[key]) || 0;
    });
  });

  const hafalan = hafalanList(db);

  let ramadhan = null;
  Object.keys(db.ramadhan || {}).forEach((date) => {
    if (date < from || date > to) return;
    const h = hijriFor(date);
    if (h.month !== 9) return;
    const row = db.ramadhan[date] || {};
    ramadhan = ramadhan || { tarawihDays: 0, tarawihRakaat: 0, tadarusPages: 0, sedekahTotal: 0, itikafDays: 0, zakatPaid: false };
    if (Number(row.tarawihRakaat) > 0) ramadhan.tarawihDays++;
    ramadhan.tarawihRakaat += Number(row.tarawihRakaat) || 0;
    ramadhan.tadarusPages += Number(row.tadarusPages) || 0;
    ramadhan.sedekahTotal += Number(row.sedekah) || 0;
    if (row.itikaf) ramadhan.itikafDays++;
    if (row.zakatPaid) ramadhan.zakatPaid = true;
  });

  const firstHijri = hijriFor(from);
  const lastHijri = hijriFor(to);
  const hijriLabel =
    firstHijri.monthName === lastHijri.monthName
      ? `${firstHijri.monthName} ${lastHijri.year} H`
      : `${firstHijri.monthName} – ${lastHijri.monthName} ${lastHijri.year} H`;

  const weakest = perPrayer.slice().sort((a, b) => a.done - b.done)[0];

  return {
    year,
    month,
    from,
    to,
    days,
    monthLabel: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)),
    hijriLabel,
    nama: profile.nama || '',
    cityName: profile.cityName || '',
    prayers: {
      percent: totalSlots ? Math.round((done / totalSlots) * 100) : 0,
      done,
      total: totalSlots,
      jamaah,
      tepat,
      qadha,
      miss
    },
    perPrayer,
    quran: { pages: quranPages, days: quranDays },
    dhikr: { total: dhikrTotal },
    sunnah,
    hafalan: { total: hafalan.total, dueCount: hafalan.dueCount },
    streak: computeStreak(db.marks),
    ramadhan,
    events,
    bestDay,
    weakest: weakest && weakest.done < days ? weakest.label : null
  };
}

function ramadhanAggregate(db, year) {
  const out = { tarawihDays: 0, tarawihRakaat: 0, tadarusPages: 0, sedekahTotal: 0, itikafDays: 0, zakatPaid: false };
  Object.keys(db.ramadhan || {}).forEach((date) => {
    const h = hijriFor(date);
    if (h.month !== 9 || h.year !== year) return;
    const row = db.ramadhan[date] || {};
    if (Number(row.tarawihRakaat) > 0) out.tarawihDays++;
    out.tarawihRakaat += Number(row.tarawihRakaat) || 0;
    out.tadarusPages += Number(row.tadarusPages) || 0;
    out.sedekahTotal += Number(row.sedekah) || 0;
    if (row.itikaf) out.itikafDays++;
    if (row.zakatPaid) out.zakatPaid = true;
  });
  return out;
}

function ramadhanPayload(db, profile, date) {
  const meta = ramadhanMeta(date, profile.hijriAdj);
  const year = meta.isRamadhan ? meta.hijri.year : meta.nextYear;
  const empty = {
    tarawihRakaat: 0,
    tadarusPages: 0,
    itikaf: false,
    sedekah: 0,
    zakatPaid: false,
    zakatAmount: 0,
    note: ''
  };
  const day = { ...empty, ...(db.ramadhan[date] || {}) };
  const month = ramadhanAggregate(db, year);

  return {
    date,
    isRamadhan: meta.isRamadhan,
    hijri: meta.hijri,
    dayOfRamadhan: meta.dayOfRamadhan,
    daysToRamadhan: meta.daysToRamadhan,
    daysInRamadhan: 30,
    year,
    schedule: scheduleFor(date, profile.cityId, profile.offsetMenit),
    day,
    month,
    dailyTarget: meta.dailyTarget,
    khatamPct: Math.min(100, Math.round((month.tadarusPages / 604) * 100)),
    tarawihTarget: 20,
    cityName: profile.cityName
  };
}

function hijriMonth(year, month) {
  const total = new Date(year, month, 0).getDate();
  const days = [];
  const events = [];
  for (let d = 1; d <= total; d++) {
    const iso = `${year}-${pad2(month)}-${pad2(d)}`;
    const hijri = hijriFor(iso);
    const weekday = parseISO(iso).getDay();
    const event = hijriEvent(hijri.month, hijri.day);
    const haram = ['10-1', '12-10', '12-11', '12-12', '12-13'].includes(`${hijri.month}-${hijri.day}`);
    days.push({
      date: iso,
      hijri,
      weekday,
      event,
      fasting: fastingForHijri(hijri, weekday),
      note: haram ? 'Dilarang berpuasa pada hari ini.' : ''
    });
    if (event) events.push({ date: iso, name: event });
  }
  return { year, month, days, events };
}

function monthDays(cityId, year, month, offsetMenit) {
  const total = new Date(year, month, 0).getDate();
  const days = [];
  for (let d = 1; d <= total; d++) days.push(dayEntry(`${year}-${pad2(month)}-${pad2(d)}`, cityId, offsetMenit));
  return days;
}

function exportCSV(db, year, month) {
  const profile = db.profile;
  const days = monthDays(profile.cityId, year, month, profile.offsetMenit);
  const head = ['Tanggal', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya', 'Skor'];
  const rows = days.map((d) => {
    const m = db.marks[d.date] || {};
    return [d.date, ...PRAYERS.map((p) => m[p.key] || '-'), dayScore(m)];
  });
  return { filename: `ibadahku-${year}-${pad2(month)}.csv`, csv: [head, ...rows].map((r) => r.join(';')).join('\n') };
}

/* ------------------------------------------------------------------- API */
const wait = (ms = 160) => new Promise((r) => setTimeout(r, ms));

export async function mockApi(action, payload = {}) {
  await wait();
  const db = load();
  const today = todayISO();
  const profile = db.profile;

  switch (action) {
    case 'bootstrap': {
      return {
        demo: true,
        profile,
        today: {
          date: today,
          hijri: hijriFor(today, profile.hijriAdj),
          schedule: scheduleFor(today, profile.cityId, profile.offsetMenit),
          cityName: profile.cityName,
          source: 'demo'
        },
        marks: db.marks[today] || {},
        streak: computeStreak(db.marks),
        quran: quranSummary(db, profile),
        dhikr: dhikrSummary(db, profile),
        sunnah: sunnahCounts(db, today),
        qadha: qadhaList(db),
        hafalan: hafalanList(db),
        stats: statsSummary(db, profile, 30)
      };
    }
    case 'city.list':
      return { cities: CITIES.map(({ id, name }) => ({ id, name })), source: 'demo' };

    case 'prayer.month': {
      const year = Number(payload.year) || new Date().getFullYear();
      const month = Number(payload.month) || new Date().getMonth() + 1;
      const dates = monthDays(profile.cityId, year, month, profile.offsetMenit).map((d) => d.date);
      const marks = {};
      dates.forEach((d) => (marks[d] = db.marks[d] || {}));
      return { year, month, cityName: profile.cityName, days: monthDays(profile.cityId, year, month, profile.offsetMenit), marks };
    }
    case 'prayer.mark': {
      const date = payload.date || today;
      db.marks[date] = db.marks[date] || {};
      if (payload.status) db.marks[date][payload.prayer] = payload.status;
      else delete db.marks[date][payload.prayer];
      save(db);
      return { date, marks: db.marks[date], streak: computeStreak(db.marks) };
    }
    case 'quran.log': {
      const pages = Math.max(1, Math.min(60, Number(payload.pages) || 1));
      const log = {
        date: payload.date || today,
        surah: payload.surah || 'Al-Fatihah',
        ayahFrom: Number(payload.ayahFrom) || 1,
        ayahTo: Number(payload.ayahTo) || 0,
        pages,
        mode: payload.mode || 'tilawah'
      };
      db.quran.push(log);
      save(db);
      return { log, summary: quranSummary(db, profile) };
    }
    case 'quran.logs':
      return { logs: (db.quran || []).slice(-12).reverse() };
    case 'quran.surahs':
      return { surahs: SURAHS };
    case 'dhikr.log': {
      const count = Math.max(0, Math.min(9999, Number(payload.count) || 0));
      db.dhikr[payload.date || today] = count;
      save(db);
      return { date: payload.date || today, count, target: Number(profile.targetDzikir) || 33 };
    }
    case 'stats.summary':
      return statsSummary(db, profile, Number(payload.days) || 30, payload.end || todayISO());

    case 'sunnah.mark': {
      const date = payload.date || today;
      const type = SUNNAH_TYPES.find((t) => t.key === payload.type);
      if (!type) throw { code: 'BAD_TYPE', message: 'Jenis sholat sunnah tidak dikenali.' };
      db.sunnah[date] = db.sunnah[date] || {};
      db.sunnah[date][type.key] = Math.max(0, Math.min(50, Number(payload.count) || 0));
      save(db);
      return { date, counts: sunnahCounts(db, date) };
    }

    case 'sunnah.get':
      return { date: payload.date || today, counts: sunnahCounts(db, payload.date || today) };

    case 'qadha.adjust': {
      const kind = QADHA_KINDS.find((k) => k.key === payload.kind);
      if (!kind) throw { code: 'BAD_KIND', message: 'Jenis qadha tidak dikenali.' };
      const delta = Math.max(-999, Math.min(999, Number(payload.delta) || 0));
      db.qadha[kind.key] = Math.max(0, Math.min(999, (Number(db.qadha[kind.key]) || 0) + delta));
      save(db);
      const list = qadhaList(db);
      return { qadha: list, total: list.reduce((a, q) => a + q.remaining, 0) };
    }

    case 'hafalan.list':
      return hafalanList(db);

    case 'hafalan.save': {
      const surah = String(payload.surah || '').slice(0, 60);
      if (!surah) throw { code: 'BAD_SURAH', message: 'Surat wajib dipilih.' };
      const from = Math.max(1, Number(payload.ayahFrom) || 1);
      const to = Math.max(from, Number(payload.ayahTo) || from);
      const score = Math.max(1, Math.min(5, Number(payload.score) || 3));
      db.hafalan.push({
        id: 'hafalan-' + Date.now().toString(36),
        surah,
        ayahFrom: from,
        ayahTo: to,
        score,
        intervalIndex: 0,
        status: score >= 4 ? 'lancar' : 'murojaah',
        nextReview: addDaysISO(today, HAFALAN_INTERVALS[0]),
        createdAt: today
      });
      save(db);
      return hafalanList(db);
    }

    case 'hafalan.review': {
      const item = db.hafalan.find((h) => h.id === payload.id);
      if (!item) throw { code: 'NOT_FOUND', message: 'Hafalan tidak ditemukan.' };
      const score = Math.max(1, Math.min(5, Number(payload.score) || 3));
      const idx = score >= 4 ? Math.min(HAFALAN_INTERVALS.length - 1, (item.intervalIndex || 0) + 1) : 0;
      item.score = score;
      item.intervalIndex = idx;
      item.status = score >= 4 ? 'lancar' : 'murojaah';
      item.nextReview = addDaysISO(today, HAFALAN_INTERVALS[idx]);
      save(db);
      return hafalanList(db);
    }

    case 'family.list':
      return familyPayload(db);

    case 'family.invite': {
      const email = String(payload.email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw { code: 'BAD_EMAIL', message: 'Alamat email tidak valid.' };
      }
      if (email === 'demo@ibadahku.app') {
        throw { code: 'SELF', message: 'Tidak bisa mengundang diri sendiri.' };
      }
      const activeCount = (db.family || []).filter((row) => row.status === 'active' || row.status === 'pending').length;
      if (activeCount >= 5) {
        throw { code: 'LIMIT', message: 'Maksimal 5 anggota per akun.' };
      }
      if ((db.family || []).some((row) => row.memberEmail === email && row.status !== 'revoked')) {
        throw { code: 'DUPLICATE', message: 'Email ini sudah diundang atau sudah menjadi anggota.' };
      }
      db.family.push({
        id: 'fam-' + Date.now().toString(36),
        ownerId: 'demo',
        memberEmail: email,
        memberId: 'm-' + email,
        memberName: email.split('@')[0],
        status: 'pending',
        createdAt: todayISO(),
        updatedAt: todayISO()
      });
      save(db);
      return familyPayload(db);
    }

    case 'family.respond': {
      const row = (db.family || []).find((item) => item.id === payload.id);
      if (!row) throw { code: 'NOT_FOUND', message: 'Undangan tidak ditemukan.' };
      row.status = payload.accept ? 'active' : 'declined';
      row.updatedAt = todayISO();
      save(db);
      return familyPayload(db);
    }

    case 'family.remove': {
      const row = (db.family || []).find((item) => item.id === payload.id);
      if (!row) throw { code: 'NOT_FOUND', message: 'Anggota tidak ditemukan.' };
      row.status = 'revoked';
      row.updatedAt = todayISO();
      save(db);
      return familyPayload(db);
    }

    case 'family.member': {
      const row = (db.family || []).find((item) => item.id === payload.id && item.status === 'active');
      if (!row) throw { code: 'FORBIDDEN', message: 'Ringkasan tidak tersedia atau izin sudah dicabut.' };
      const stats = memberStats(row.memberId);
      return {
        id: row.id,
        name: row.memberName,
        email: maskEmail(row.memberEmail),
        since: row.updatedAt || row.createdAt,
        lastSeen: stats.lastSeen,
        summary: stats
      };
    }

    case 'target.list':
      return targetPayload(db);

    case 'target.create': {
      const title = String(payload.title || '').trim().slice(0, 80);
      if (title.length < 3) throw { code: 'BAD_TITLE', message: 'Judul target minimal 3 karakter.' };
      const missions = (Array.isArray(payload.missions) ? payload.missions : [])
        .map((value) => String(value || '').trim().slice(0, 120))
        .filter((value, index, list) => value && list.indexOf(value) === index)
        .slice(0, 10);
      if (!missions.length) throw { code: 'NO_MISSION', message: 'Tambahkan minimal satu misi hafalan.' };
      const activeCount = (db.targets || []).filter((row) => row.status === 'active').length;
      if (activeCount >= 12) throw { code: 'LIMIT', message: 'Maksimal 12 target aktif.' };
      const member = (db.family || []).find(
        (row) => row.id === payload.memberId && row.ownerId === 'demo' && row.status === 'active'
      );
      const stamp = Date.now().toString(36);
      db.targets = db.targets || [];
      db.targets.push({
        id: 'tgt-' + stamp,
        ownerId: 'demo',
        memberId: member ? member.memberId : 'demo',
        memberName: member ? member.memberName : 'Saya sendiri',
        title,
        note: '',
        dueDate: String(payload.dueDate || ''),
        status: 'active',
        createdAt: todayISO(),
        missions: missions.map((label, index) => ({
          id: 'ms-' + stamp + '-' + index,
          label,
          done: false,
          doneBy: '',
          doneAt: ''
        }))
      });
      save(db);
      return targetPayload(db);
    }

    case 'target.mission.toggle': {
      const target = (db.targets || []).find((row) => row.id === payload.targetId && row.status !== 'archived');
      if (!target) throw { code: 'NOT_FOUND', message: 'Target tidak ditemukan.' };
      const mission = (target.missions || []).find((item) => item.id === payload.missionId);
      if (!mission) throw { code: 'NOT_FOUND', message: 'Misi tidak ditemukan.' };
      const done = typeof payload.done === 'boolean' ? payload.done : !mission.done;
      mission.done = done;
      mission.doneBy = done ? 'demo' : '';
      mission.doneAt = done ? todayISO() : '';
      const all = target.missions || [];
      target.status = all.length && all.every((item) => item.done) ? 'done' : 'active';
      save(db);
      return targetPayload(db);
    }

    case 'target.mission.add': {
      const target = (db.targets || []).find((row) => row.id === payload.targetId && row.status !== 'archived');
      if (!target) throw { code: 'NOT_FOUND', message: 'Target tidak ditemukan.' };
      const label = String(payload.label || '').trim().slice(0, 120);
      if (!label) throw { code: 'BAD_LABEL', message: 'Tulis misi yang ingin ditambahkan.' };
      target.missions = target.missions || [];
      if (target.missions.length >= 20) throw { code: 'LIMIT', message: 'Maksimal 20 misi per target.' };
      if (target.missions.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
        throw { code: 'DUPLICATE', message: 'Misi ini sudah ada di target.' };
      }
      target.missions.push({
        id: 'ms-' + Date.now().toString(36),
        label,
        done: false,
        doneBy: '',
        doneAt: ''
      });
      target.status = 'active';
      save(db);
      return targetPayload(db);
    }

    case 'target.remove': {
      const target = (db.targets || []).find((row) => row.id === payload.targetId);
      if (!target) throw { code: 'NOT_FOUND', message: 'Target tidak ditemukan.' };
      target.status = 'archived';
      save(db);
      return targetPayload(db);
    }

    case 'report.month': {
      const year = Number(payload.year) || new Date().getFullYear();
      const month = Number(payload.month) || new Date().getMonth() + 1;
      return monthlyReport(db, profile, year, month);
    }

    case 'ramadhan.day':
      return ramadhanPayload(db, profile, payload.date || today);

    case 'ramadhan.save': {
      const date = payload.date || today;
      const patch = payload.patch || {};
      const current = {
        tarawihRakaat: 0,
        tadarusPages: 0,
        itikaf: false,
        sedekah: 0,
        zakatPaid: false,
        zakatAmount: 0,
        note: '',
        ...(db.ramadhan[date] || {})
      };
      if (patch.tarawihRakaat !== undefined) current.tarawihRakaat = Math.max(0, Math.min(36, Number(patch.tarawihRakaat) || 0));
      if (patch.tadarusPages !== undefined) current.tadarusPages = Math.max(0, Math.min(60, Number(patch.tadarusPages) || 0));
      if (patch.itikaf !== undefined) current.itikaf = Boolean(patch.itikaf);
      if (patch.zakatPaid !== undefined) current.zakatPaid = Boolean(patch.zakatPaid);
      if (patch.zakatAmount !== undefined) current.zakatAmount = Math.max(0, Math.min(1000000000, Number(patch.zakatAmount) || 0));
      if (patch.sedekah !== undefined) current.sedekah = Math.max(0, Math.min(1000000000, Number(patch.sedekah) || 0));
      if (patch.note !== undefined) current.note = String(patch.note).slice(0, 200);
      db.ramadhan[date] = current;
      save(db);
      return ramadhanPayload(db, profile, date);
    }

    case 'hijri.month': {
      const year = Number(payload.year) || new Date().getFullYear();
      const month = Number(payload.month) || new Date().getMonth() + 1;
      return hijriMonth(year, month);
    }
    case 'profile.save': {
      Object.assign(db.profile, payload || {});
      if (payload.cityId) {
        const city = CITIES.find((c) => c.id === String(payload.cityId));
        if (city) db.profile.cityName = city.name;
      }
      save(db);
      return { profile: db.profile };
    }
    case 'journal.save': {
      const date = payload.date || today;
      db.journal[date] = {
        date,
        syukur: String(payload.syukur || '').slice(0, 2000),
        muhasabah: String(payload.muhasabah || '').slice(0, 2000),
        doa: String(payload.doa || '').slice(0, 2000)
      };
      save(db);
      return { saved: true, journal: db.journal[date] };
    }
    case 'journal.get':
      return { journal: db.journal[payload.date || today] || null };
    case 'export.month': {
      const year = Number(payload.year) || new Date().getFullYear();
      const month = Number(payload.month) || new Date().getMonth() + 1;
      return exportCSV(db, year, month);
    }
    case 'reset.demo': {
      window.localStorage.removeItem(KEY);
      return { ok: true };
    }
    default:
      throw { code: 'UNKNOWN_ACTION', message: `Aksi tidak dikenali: ${action}` };
  }
}

export { scheduleFor, computeStreak, statsSummary, parseISO };
