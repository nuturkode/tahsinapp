/** Al-Qur'an (EQuran.id) & catatan tilawah. */

function surahs_() {
  var cached = cacheGet_('surahs:v2');
  if (cached) return cached;

  var list = [];
  try {
    var res = UrlFetchApp.fetch('https://equran.id/api/v2/surat', {
      muteHttpExceptions: true,
      headers: { Accept: 'application/json' }
    });
    var body = JSON.parse(res.getContentText());
    if (body && body.data) {
      list = body.data.map(function (s) {
        return { nomor: Number(s.nomor), nama: String(s.namaLatin) };
      });
    }
  } catch (err) {
    list = [];
  }

  if (list.length) cachePut_('surahs:v2', list, 21600);
  return list;
}

function quranLogs_(user) {
  var logs = [];
  readTable_('QuranLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    logs.push({
      date: String(row.date),
      surah: String(row.surah),
      ayahFrom: Number(row.ayah_from) || 0,
      ayahTo: Number(row.ayah_to) || 0,
      pages: Number(row.pages) || 0,
      mode: String(row.mode || 'tilawah')
    });
  });
  logs.sort(function (a, b) {
    return a.date < b.date ? 1 : -1;
  });
  return logs.slice(0, 12);
}

function quranSummary_(user, profile) {
  var today = todayISO_();
  var todayPages = 0;
  var totalPages = 0;
  var last = null;

  readTable_('QuranLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var pages = Number(row.pages) || 0;
    totalPages += pages;
    if (String(row.date) === today) todayPages += pages;
    last = { date: String(row.date), surah: String(row.surah), pages: pages };
  });

  return {
    todayPages: todayPages,
    target: Number(profile.target_tilawah) || 4,
    totalPages: totalPages,
    khatamPct: Math.min(100, Math.round((totalPages / 604) * 100)),
    lastLog: last
  };
}

function dhikrSummary_(user, profile) {
  var today = todayISO_();
  var count = 0;
  readTable_('DhikrLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    if (String(row.date) !== today) return;
    count += Number(row.count) || 0;
  });
  return { todayCount: count, target: Number(profile.target_dzikir) || 33 };
}
