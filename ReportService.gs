/**
 * Laporan bulanan siap dibagikan.
 * Menghasilkan satu objek ringkas yang dipakai kartu gambar, teks WhatsApp, dan cetak PDF.
 */

var MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

var PRAYER_LABELS = {
  subuh: 'Subuh',
  dzuhur: 'Dzuhur',
  ashar: 'Ashar',
  maghrib: 'Maghrib',
  isya: 'Isya'
};

function monthlyReport_(user, profile, year, month) {
  var from = year + '-' + pad2_(month) + '-01';
  var lastDay = new Date(year, month, 0).getDate();
  var today = todayISO_();
  var lastOfMonth = year + '-' + pad2_(month) + '-' + pad2_(lastDay);
  var to = lastOfMonth > today ? today : lastOfMonth;
  var days = Number(to.slice(8, 10)) || 0;

  var byDate = {};
  readTable_('PrayerLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    if (date < from || date > to) return;
    byDate[date] = byDate[date] || {};
    if (row.status) byDate[date][row.prayer] = String(row.status);
  });

  var done = 0;
  var jamaah = 0;
  var tepat = 0;
  var qadha = 0;
  var miss = 0;
  var perPrayerCount = { subuh: 0, dzuhur: 0, ashar: 0, maghrib: 0, isya: 0 };
  var heatmap = [];
  var bestDay = null;
  var events = [];

  for (var d = 1; d <= days; d++) {
    var iso = year + '-' + pad2_(month) + '-' + pad2_(d);
    var marks = byDate[iso] || {};
    var score = 0;

    for (var k = 0; k < PRAYER_KEYS.length; k++) {
      var key = PRAYER_KEYS[k];
      var status = marks[key];
      if (status) {
        score++;
        done++;
        perPrayerCount[key]++;
        if (status === 'jamaah') jamaah++;
        else if (status === 'tepat') tepat++;
        else qadha++;
      } else {
        miss++;
      }
    }

    heatmap.push({ date: iso, score: score });
    if (!bestDay || score > bestDay.score) bestDay = { date: iso, score: score };

    var hijri = hijriFromISO_(iso, profile.hijri_adj);
    var event = HIJRI_EVENTS[hijri.month + '-' + hijri.day];
    if (event) events.push({ date: iso, name: event });
  }

  var totalSlots = days * 5;
  var perPrayer = PRAYER_KEYS.map(function (key) {
    return {
      key: key,
      label: PRAYER_LABELS[key] || key,
      done: perPrayerCount[key],
      percent: days ? Math.round((perPrayerCount[key] / days) * 100) : 0
    };
  });

  var quranPages = 0;
  var quranDates = {};

  readTable_('QuranLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    if (date < from || date > to) return;
    quranPages += Number(row.pages) || 0;
    quranDates[date] = true;
  });

  var dhikrTotal = 0;
  readTable_('DhikrLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    if (date < from || date > to) return;
    dhikrTotal += Number(row.count) || 0;
  });

  var sunnahTotals = { rawatib: 0, dhuha: 0, tahajud: 0, witir: 0 };
  readTable_('SunnahLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    if (date < from || date > to) return;
    var type = String(row.type);
    if (sunnahTotals[type] === undefined) return;
    sunnahTotals[type] += Number(row.count) || 0;
  });

  var hafalan = hafalanList_(user);

  var ramadhan = null;
  readTable_('RamadhanLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    if (date < from || date > to) return;
    var h = hijriFromISO_(date, profile.hijri_adj);
    if (h.month !== 9) return;

    ramadhan = ramadhan || {
      tarawihDays: 0,
      tarawihRakaat: 0,
      tadarusPages: 0,
      sedekahTotal: 0,
      itikafDays: 0,
      zakatPaid: false
    };

    var rakaat = Number(row.tarawih_rakaat) || 0;
    if (rakaat > 0) ramadhan.tarawihDays++;
    ramadhan.tarawihRakaat += rakaat;
    ramadhan.tadarusPages += Number(row.tadarus_pages) || 0;
    ramadhan.sedekahTotal += Number(row.sedekah) || 0;
    if (asBool_(row.itikaf)) ramadhan.itikafDays++;
    if (asBool_(row.zakat_paid)) ramadhan.zakatPaid = true;
  });

  var firstHijri = hijriFromISO_(from, profile.hijri_adj);
  var lastHijri = hijriFromISO_(to, profile.hijri_adj);
  var hijriLabel =
    firstHijri.monthName === lastHijri.monthName
      ? firstHijri.monthName + ' ' + lastHijri.year + ' H'
      : firstHijri.monthName + ' – ' + lastHijri.monthName + ' ' + lastHijri.year + ' H';

  var weakest = null;
  for (var w = 0; w < perPrayer.length; w++) {
    if (!weakest || perPrayer[w].done < weakest.done) weakest = perPrayer[w];
  }

  return {
    year: year,
    month: month,
    from: from,
    to: to,
    days: days,
    monthLabel: MONTHS_ID[month - 1] + ' ' + year,
    hijriLabel: hijriLabel,
    nama: profile.nama || '',
    cityName: profile.city_name || '',
    prayers: {
      percent: totalSlots ? Math.round((done / totalSlots) * 100) : 0,
      done: done,
      total: totalSlots,
      jamaah: jamaah,
      tepat: tepat,
      qadha: qadha,
      miss: miss
    },
    perPrayer: perPrayer,
    quran: { pages: quranPages, days: Object.keys(quranDates).length },
    dhikr: { total: dhikrTotal },
    sunnah: sunnahTotals,
    hafalan: { total: hafalan.total, dueCount: hafalan.dueCount },
    streak: streakFor_(user),
    ramadhan: ramadhan,
    events: events,
    bestDay: bestDay,
    weakest: weakest && weakest.done < days ? weakest.label : null
  };
}
