/** Agregasi statistik ibadah. */

function statsSummary_(user, profile, days, end) {
  var span = Math.min(365, Math.max(1, Number(days) || 30));
  var endISO = end || todayISO_();
  var fromISO = addDaysISO_(endISO, -(span - 1));

  var byDate = {};
  readTable_('PrayerLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    if (date < fromISO || date > endISO) return;
    byDate[date] = byDate[date] || {};
    if (row.status) byDate[date][row.prayer] = String(row.status);
  });

  var heatmap = [];
  var perPrayer = { subuh: 0, dzuhur: 0, ashar: 0, maghrib: 0, isya: 0 };
  var composition = { jamaah: 0, tepat: 0, qadha: 0, kosong: 0 };
  var done = 0;

  for (var i = 0; i < span; i++) {
    var iso = addDaysISO_(fromISO, i);
    var marks = byDate[iso] || {};
    var score = 0;
    for (var k = 0; k < PRAYER_KEYS.length; k++) {
      var key = PRAYER_KEYS[k];
      var status = marks[key];
      if (status) {
        score++;
        done++;
        perPrayer[key]++;
        if (composition[status] === undefined) composition.kosong++;
        else composition[status]++;
      } else {
        composition.kosong++;
      }
    }
    heatmap.push({ date: iso, score: score });
  }

  var quranMap = {};
  readTable_('QuranLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    if (date < fromISO || date > endISO) return;
    quranMap[date] = (quranMap[date] || 0) + (Number(row.pages) || 0);
  });

  var quran = Object.keys(quranMap)
    .sort()
    .map(function (date) {
      return { date: date, pages: quranMap[date] };
    });

  return {
    from: fromISO,
    to: endISO,
    days: span,
    percent: span * 5 ? Math.round((done / (span * 5)) * 100) : 0,
    streak: computeStreak_(byDate, endISO),
    totalPrayers: span * 5,
    donePrayers: done,
    heatmap: heatmap,
    perPrayer: perPrayer,
    composition: composition,
    quran: quran
  };
}

function dayScore_(marks) {
  var score = 0;
  for (var i = 0; i < PRAYER_KEYS.length; i++) {
    if (marks && marks[PRAYER_KEYS[i]]) score++;
  }
  return score;
}

function computeStreak_(byDate, endISO) {
  var streak = 0;
  var cursor = endISO || todayISO_();
  if (dayScore_(byDate[cursor]) < 5) cursor = addDaysISO_(cursor, -1);

  while (dayScore_(byDate[cursor]) >= 5) {
    streak++;
    cursor = addDaysISO_(cursor, -1);
    if (streak > 3650) break;
  }
  return streak;
}

function streakFor_(user) {
  var byDate = {};
  readTable_('PrayerLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    byDate[date] = byDate[date] || {};
    if (row.status) byDate[date][row.prayer] = String(row.status);
  });
  return computeStreak_(byDate, todayISO_());
}
