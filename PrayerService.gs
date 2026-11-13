/**
 * Jadwal sholat.
 * Sumber utama: myQuran API v2 (data Bimas Islam Kemenag, per kabupaten/kota).
 * Cadangan: Aladhan API v1, method=20 (KEMENAG), berdasarkan nama kota.
 * Cache: CacheService 6 jam + sheet PrayerCache (per kota per bulan).
 */

var FALLBACK_CITIES_ = [
  { id: '1301', name: 'KOTA JAKARTA' },
  { id: '1219', name: 'KOTA BANDUNG' },
  { id: '1427', name: 'KOTA SEMARANG' },
  { id: '1481', name: 'KOTA YOGYAKARTA' },
  { id: '1638', name: 'KOTA SURABAYA' },
  { id: '1108', name: 'KOTA MEDAN' },
  { id: '1701', name: 'KOTA MAKASSAR' }
];

function cityList_() {
  var cached = cacheGet_('cities:v1');
  if (cached) return cached;

  var list = [];
  try {
    var res = UrlFetchApp.fetch('https://api.myquran.com/v2/sholat/kota/semua', {
      muteHttpExceptions: true,
      headers: { Accept: 'application/json' }
    });
    var body = JSON.parse(res.getContentText());
    if (body && body.status && body.data) {
      list = body.data.map(function (item) {
        return { id: String(item.id), name: String(item.lokasi) };
      });
    }
  } catch (err) {
    list = [];
  }

  if (!list.length) list = FALLBACK_CITIES_;
  cachePut_('cities:v1', list, 21600);
  return list;
}

function shiftTime_(time, minutes) {
  var text = String(time || '').trim();
  if (!text) return '';
  var parts = text.split(':');
  var total = Number(parts[0]) * 60 + Number(parts[1]) + Number(minutes || 0);
  total = ((total % 1440) + 1440) % 1440;
  return pad2_(Math.floor(total / 60)) + ':' + pad2_(total % 60);
}

function normMyQuranDay_(day) {
  return {
    date: String(day.date),
    imsak: shiftTime_(day.imsak, 0),
    subuh: shiftTime_(day.subuh, 0),
    syuruq: shiftTime_(day.terbit, 0),
    dhuha: shiftTime_(day.dhuha, 0),
    dzuhur: shiftTime_(day.dzuhur, 0),
    ashar: shiftTime_(day.ashar, 0),
    maghrib: shiftTime_(day.maghrib, 0),
    isya: shiftTime_(day.isya, 0)
  };
}

function normAladhanDay_(day) {
  var t = day.timings || {};
  var g = (day.date && day.date.gregorian && day.date.gregorian.date) || '';
  var parts = String(g).split('-'); // DD-MM-YYYY
  var iso = parts.length === 3 ? parts[2] + '-' + parts[1] + '-' + parts[0] : '';
  return {
    date: iso,
    imsak: shiftTime_(t.Imsak, 0),
    subuh: shiftTime_(t.Fajr, 0),
    syuruq: shiftTime_(t.Sunrise, 0),
    dhuha: shiftTime_(t.Sunrise, 20),
    dzuhur: shiftTime_(t.Dhuhr, 0),
    ashar: shiftTime_(t.Asr, 0),
    maghrib: shiftTime_(t.Maghrib, 0),
    isya: shiftTime_(t.Isha, 0)
  };
}

function fetchMyQuranMonth_(cityId, year, month) {
  try {
    var url =
      'https://api.myquran.com/v2/sholat/jadwal/' +
      encodeURIComponent(cityId) +
      '/' +
      year +
      '/' +
      pad2_(month);
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { Accept: 'application/json' } });
    var body = JSON.parse(res.getContentText());
    if (body && body.status && body.data && body.data.jadwal) {
      return body.data.jadwal.map(normMyQuranDay_);
    }
  } catch (err) {
    return [];
  }
  return [];
}

function fetchAladhanMonth_(cityName, year, month) {
  try {
    var url =
      'https://api.aladhan.com/v1/calendarByCity/' +
      year +
      '/' +
      month +
      '?city=' +
      encodeURIComponent(cityName || 'Jakarta') +
      '&country=Indonesia&method=20&school=0';
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { Accept: 'application/json' } });
    var body = JSON.parse(res.getContentText());
    if (body && body.data && body.data.length) {
      return body.data.map(normAladhanDay_).filter(function (day) {
        return day.date;
      });
    }
  } catch (err) {
    return [];
  }
  return [];
}

function monthSchedule_(cityId, cityName, year, month) {
  var key = String(cityId) + '|' + year + '-' + pad2_(month);

  var memory = cacheGet_('sched:' + key);
  if (memory) return memory;

  var stored = sheetCacheGet_(key);
  if (stored) {
    cachePut_('sched:' + key, stored, 21600);
    return stored;
  }

  var days = fetchMyQuranMonth_(cityId, year, month);
  if (!days.length) days = fetchAladhanMonth_(cityName, year, month);

  if (days.length) {
    sheetCachePut_(key, days);
    cachePut_('sched:' + key, days, 21600);
  }
  return days;
}

function daySchedule_(cityId, cityName, iso, offset) {
  var date = parseISO_(iso);
  var days = monthSchedule_(cityId, cityName, date.getFullYear(), date.getMonth() + 1);
  for (var i = 0; i < days.length; i++) {
    if (days[i].date === iso) {
      var day = days[i];
      var shift = Number(offset) || 0;
      return {
        imsak: shiftTime_(day.imsak, shift),
        subuh: shiftTime_(day.subuh, shift),
        syuruq: shiftTime_(day.syuruq, shift),
        dhuha: shiftTime_(day.dhuha, shift),
        dzuhur: shiftTime_(day.dzuhur, shift),
        ashar: shiftTime_(day.ashar, shift),
        maghrib: shiftTime_(day.maghrib, shift),
        isya: shiftTime_(day.isya, shift)
      };
    }
  }
  return null;
}

function prayerMonthDto_(user, profile, year, month) {
  var days = monthSchedule_(profile.city_id, profile.city_name, year, month);
  var shift = Number(profile.offset_menit) || 0;
  var marks = {};

  readTable_('PrayerLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    if (date.indexOf(String(year) + '-' + pad2_(month)) !== 0) return;
    marks[date] = marks[date] || {};
    if (row.status) marks[date][row.prayer] = String(row.status);
  });

  return {
    year: year,
    month: month,
    cityName: profile.city_name,
    days: days.map(function (day) {
      var out = { date: day.date };
      ['imsak', 'subuh', 'syuruq', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'].forEach(function (key) {
        out[key] = shiftTime_(day[key], shift);
      });
      return out;
    }),
    marks: marks
  };
}

function marksFor_(user, iso) {
  var out = {};
  readTable_('PrayerLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    if (String(row.date) !== String(iso)) return;
    if (row.status) out[row.prayer] = String(row.status);
  });
  return out;
}
