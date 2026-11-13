/**
 * Amalan pendukung (Fase 2): sholat sunnah, qadha, hafalan/murojaah,
 * dan kalender hijriah (hari besar + anjuran puasa sunnah).
 */

var SUNNAH_TYPES = [
  { key: 'rawatib', label: 'Rawatib', target: 12, note: '12 rakaat mengiringi fardhu' },
  { key: 'dhuha', label: 'Dhuha', target: 2, note: '2–12 rakaat, waktu naik matahari' },
  { key: 'tahajud', label: 'Tahajud', target: 2, note: 'sepertiga malam terakhir' },
  { key: 'witir', label: 'Witir', target: 3, note: 'penutup sholat malam' }
];

var QADHA_KINDS = [
  { key: 'subuh', label: 'Subuh' },
  { key: 'dzuhur', label: 'Dzuhur' },
  { key: 'ashar', label: 'Ashar' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isya', label: 'Isya' },
  { key: 'puasa', label: 'Puasa' }
];

var HAFALAN_INTERVALS = [1, 3, 7, 14, 30];

var HIJRI_EVENTS = {
  '1-1': 'Tahun Baru Hijriah',
  '1-10': 'Hari Asyura',
  '3-12': 'Maulid Nabi Muhammad',
  '7-27': 'Isra Mi\u2019raj',
  '8-15': 'Nisfu Sya\u2019ban',
  '9-1': 'Awal Ramadhan',
  '9-17': 'Nuzulul Qur\u2019an',
  '10-1': 'Idul Fitri',
  '12-9': 'Hari Arafah',
  '12-10': 'Idul Adha',
  '12-11': 'Hari Tasyrik',
  '12-12': 'Hari Tasyrik',
  '12-13': 'Hari Tasyrik'
};

var HARAM_FASTING_DAYS = { '10-1': 1, '12-10': 1, '12-11': 1, '12-12': 1, '12-13': 1 };

/* --------------------------------------------------------------- sunnah */

function sunnahCounts_(user, date) {
  var counts = {};
  SUNNAH_TYPES.forEach(function (type) {
    counts[type.key] = 0;
  });
  readTable_('SunnahLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    if (String(row.date) !== String(date)) return;
    if (counts[row.type] === undefined) counts[row.type] = 0;
    counts[row.type] = Number(row.count) || 0;
  });
  return counts;
}

function markSunnah_(user, payload) {
  var date = String(payload.date || todayISO_());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw userError_('BAD_DATE', 'Tanggal tidak valid.');
  if (date > todayISO_()) throw userError_('DATE_FUTURE', 'Tidak bisa mencatat tanggal yang belum terjadi.');
  if (date < addDaysISO_(todayISO_(), -365)) throw userError_('DATE_OLD', 'Tanggal terlalu lama (maksimal 1 tahun).');

  var type = String(payload.type || '');
  var known = false;
  for (var i = 0; i < SUNNAH_TYPES.length; i++) {
    if (SUNNAH_TYPES[i].key === type) known = true;
  }
  if (!known) throw userError_('BAD_TYPE', 'Jenis sholat sunnah tidak dikenali.');

  var count = clamp_(payload.count, 0, 50, 0);
  var logId = user.id + '|' + date + '|' + type;

  withLock_(function () {
    var exists = false;
    var rows = readTable_('SunnahLog');
    for (var k = 0; k < rows.length; k++) {
      if (String(rows[k].log_id) === logId) {
        exists = true;
        break;
      }
    }
    if (exists) {
      updateRow_('SunnahLog', 'log_id', logId, { count: count, updated_at: nowIso_() });
    } else {
      appendRow_('SunnahLog', {
        log_id: logId,
        user_id: user.id,
        date: date,
        type: type,
        count: count,
        updated_at: nowIso_()
      });
    }
  });

  return { date: date, counts: sunnahCounts_(user, date) };
}

/* ---------------------------------------------------------------- qadha */

function qadhaList_(user) {
  var rows = readTable_('Qadha');
  var map = {};
  rows.forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    map[String(row.kind)] = Number(row.remaining) || 0;
  });
  return QADHA_KINDS.map(function (kind) {
    return { kind: kind.key, label: kind.label, remaining: map[kind.key] || 0 };
  });
}

function qadhaTotal_(list) {
  return list.reduce(function (sum, item) {
    return sum + (Number(item.remaining) || 0);
  }, 0);
}

function adjustQadha_(user, payload) {
  var kind = String(payload.kind || '');
  var known = false;
  for (var i = 0; i < QADHA_KINDS.length; i++) {
    if (QADHA_KINDS[i].key === kind) known = true;
  }
  if (!known) throw userError_('BAD_KIND', 'Jenis qadha tidak dikenali.');

  var delta = clamp_(payload.delta, -999, 999, 0);
  var logId = user.id + '|' + kind;

  withLock_(function () {
    var rows = readTable_('Qadha');
    var current = 0;
    var exists = false;
    for (var k = 0; k < rows.length; k++) {
      if (String(rows[k].log_id) === logId) {
        exists = true;
        current = Number(rows[k].remaining) || 0;
        break;
      }
    }
    var next = Math.max(0, Math.min(999, current + delta));
    if (exists) {
      updateRow_('Qadha', 'log_id', logId, { remaining: next, updated_at: nowIso_() });
    } else {
      appendRow_('Qadha', {
        log_id: logId,
        user_id: user.id,
        kind: kind,
        remaining: next,
        updated_at: nowIso_()
      });
    }
  });

  var list = qadhaList_(user);
  return { qadha: list, total: qadhaTotal_(list) };
}

/* -------------------------------------------------------------- hafalan */

function hafalanList_(user) {
  var today = todayISO_();
  var items = [];

  readTable_('Hafalan').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var nextReview = String(row.next_review || today);
    items.push({
      id: String(row.log_id),
      surah: String(row.surah || ''),
      ayahFrom: Number(row.ayah_from) || 0,
      ayahTo: Number(row.ayah_to) || 0,
      score: Number(row.score) || 0,
      status: String(row.status || 'baru'),
      intervalIndex: Number(row.interval_index) || 0,
      nextReview: nextReview,
      due: nextReview <= today
    });
  });

  items.sort(function (a, b) {
    return a.nextReview < b.nextReview ? -1 : a.nextReview > b.nextReview ? 1 : 0;
  });

  return {
    items: items,
    dueCount: items.filter(function (item) {
      return item.due;
    }).length,
    total: items.length
  };
}

function saveHafalan_(user, payload) {
  var surah = clean_(payload.surah || '', 60);
  if (!surah) throw userError_('BAD_SURAH', 'Surat wajib dipilih.');

  var from = clamp_(payload.ayahFrom, 1, 300, 1);
  var to = Math.max(from, clamp_(payload.ayahTo, 1, 300, from));
  var score = clamp_(payload.score, 1, 5, 3);
  var nextReview = addDaysISO_(todayISO_(), HAFALAN_INTERVALS[0]);

  withLock_(function () {
    appendRow_('Hafalan', {
      log_id: user.id + '|' + Utilities.getUuid(),
      user_id: user.id,
      surah: surah,
      ayah_from: from,
      ayah_to: to,
      juz: 0,
      status: score >= 4 ? 'lancar' : 'murojaah',
      score: score,
      interval_index: 0,
      next_review: nextReview,
      created_at: nowIso_(),
      updated_at: nowIso_()
    });
  });

  return hafalanList_(user);
}

function reviewHafalan_(user, payload) {
  var id = String(payload.id || '');
  var score = clamp_(payload.score, 1, 5, 3);
  var rows = readTable_('Hafalan');
  var target = null;

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].log_id) === id && String(rows[i].user_id) === user.id) {
      target = rows[i];
      break;
    }
  }
  if (!target) throw userError_('NOT_FOUND', 'Hafalan tidak ditemukan.');

  var index = Number(target.interval_index) || 0;
  index = score >= 4 ? Math.min(HAFALAN_INTERVALS.length - 1, index + 1) : 0;
  var nextReview = addDaysISO_(todayISO_(), HAFALAN_INTERVALS[index]);

  withLock_(function () {
    updateRow_('Hafalan', 'log_id', id, {
      score: score,
      interval_index: index,
      next_review: nextReview,
      status: score >= 4 ? 'lancar' : 'murojaah',
      updated_at: nowIso_()
    });
  });

  return hafalanList_(user);
}

/* ------------------------------------------------------------- kalender */

function fastingForHijri_(hijri, weekdayIndex) {
  var key = hijri.month + '-' + hijri.day;
  if (HARAM_FASTING_DAYS[key]) return null;
  if (hijri.month === 12 && hijri.day === 9) return { type: 'arafah', label: 'Puasa Arafah' };
  if (hijri.month === 1 && hijri.day === 10) return { type: 'asyura', label: 'Puasa Asyura' };
  if (hijri.day === 13 || hijri.day === 14 || hijri.day === 15) {
    return { type: 'ayyamul-bidh', label: 'Ayyamul Bidh' };
  }
  if (weekdayIndex === 1 || weekdayIndex === 4) return { type: 'senin-kamis', label: 'Puasa Senin/Kamis' };
  return null;
}

function hijriMonth_(year, month) {
  var total = new Date(year, month, 0).getDate();
  var days = [];
  var events = [];

  for (var d = 1; d <= total; d++) {
    var iso = year + '-' + pad2_(month) + '-' + pad2_(d);
    var hijri = hijriFromISO_(iso, 0);
    var weekday = parseISO_(iso).getDay();
    var eventName = HIJRI_EVENTS[hijri.month + '-' + hijri.day] || '';
    var prohibited = HARAM_FASTING_DAYS[hijri.month + '-' + hijri.day];

    days.push({
      date: iso,
      hijri: hijri,
      weekday: weekday,
      event: eventName,
      fasting: fastingForHijri_(hijri, weekday),
      note: prohibited ? 'Dilarang berpuasa pada hari ini.' : ''
    });

    if (eventName) events.push({ date: iso, name: eventName });
  }

  return { year: year, month: month, days: days, events: events };
}
