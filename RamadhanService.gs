/**
 * Mode Ramadhan: imsakiyah harian, tracker tarawih, tadarus (target khatam 604 halaman),
 * i'tikaf, zakat fitrah, sedekah, dan rekap per bulan Ramadhan.
 */

var TADARUS_TOTAL_PAGES = 604;
var RAMADHAN_DAYS = 30;
var TARAWIH_TARGET = 20;

function asBool_(value) {
  return value === true || value === 'TRUE' || value === true || value === 1 || value === '1' || value === 'true';
}

function ramadhanMeta_(iso, adj) {
  var hijri = hijriFromISO_(iso, adj);
  var isRamadhan = hijri.month === 9;
  var daysToRamadhan = 0;
  var nextYear = hijri.year;

  if (!isRamadhan) {
    for (var i = 1; i <= 400; i++) {
      var h = hijriFromISO_(addDaysISO_(iso, i), adj);
      if (h.month === 9 && h.day === 1) {
        daysToRamadhan = i;
        nextYear = h.year;
        break;
      }
    }
  }

  return {
    hijri: hijri,
    isRamadhan: isRamadhan,
    dayOfRamadhan: isRamadhan ? hijri.day : 0,
    daysToRamadhan: daysToRamadhan,
    nextYear: nextYear,
    dailyTarget: Math.ceil(TADARUS_TOTAL_PAGES / RAMADHAN_DAYS)
  };
}

function ramadhanAggregate_(user, year, adj) {
  var result = {
    tarawihDays: 0,
    tarawihRakaat: 0,
    tadarusPages: 0,
    sedekahTotal: 0,
    itikafDays: 0,
    zakatPaid: false
  };

  readTable_('RamadhanLog').forEach(function (row) {
    if (String(row.user_id) !== user.id) return;
    var date = String(row.date);
    var h = hijriFromISO_(date, adj);
    if (h.month !== 9 || h.year !== year) return;

    var rakaat = Number(row.tarawih_rakaat) || 0;
    if (rakaat > 0) result.tarawihDays++;
    result.tarawihRakaat += rakaat;
    result.tadarusPages += Number(row.tadarus_pages) || 0;
    result.sedekahTotal += Number(row.sedekah) || 0;
    if (asBool_(row.itikaf)) result.itikafDays++;
    if (asBool_(row.zakat_paid)) result.zakatPaid = true;
  });

  return result;
}

function ramadhanPayload_(user, profile, date) {
  var meta = ramadhanMeta_(date, profile.hijri_adj);
  var year = meta.isRamadhan ? meta.hijri.year : meta.nextYear;

  var empty = {
    tarawihRakaat: 0,
    tadarusPages: 0,
    itikaf: false,
    sedekah: 0,
    zakatPaid: false,
    zakatAmount: 0,
    note: ''
  };

  var day = empty;
  var rows = readTable_('RamadhanLog');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].user_id) !== user.id || String(rows[i].date) !== date) continue;
    day = {
      tarawihRakaat: Number(rows[i].tarawih_rakaat) || 0,
      tadarusPages: Number(rows[i].tadarus_pages) || 0,
      itikaf: asBool_(rows[i].itikaf),
      sedekah: Number(rows[i].sedekah) || 0,
      zakatPaid: asBool_(rows[i].zakat_paid),
      zakatAmount: Number(rows[i].zakat_amount) || 0,
      note: String(rows[i].note || '')
    };
    break;
  }

  var month = ramadhanAggregate_(user, year, profile.hijri_adj);

  return {
    date: date,
    isRamadhan: meta.isRamadhan,
    hijri: meta.hijri,
    dayOfRamadhan: meta.dayOfRamadhan,
    daysToRamadhan: meta.daysToRamadhan,
    daysInRamadhan: RAMADHAN_DAYS,
    year: year,
    schedule: daySchedule_(profile.city_id, profile.city_name, date, profile.offset_menit) || {},
    day: day,
    month: month,
    dailyTarget: meta.dailyTarget,
    khatamPct: Math.min(100, Math.round((month.tadarusPages / TADARUS_TOTAL_PAGES) * 100)),
    tarawihTarget: TARAWIH_TARGET,
    cityName: profile.city_name
  };
}

function saveRamadhan_(user, profile, payload) {
  var date = String(payload.date || todayISO_());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw userError_('BAD_DATE', 'Tanggal tidak valid.');
  if (date > todayISO_()) throw userError_('DATE_FUTURE', 'Tidak bisa mencatat tanggal yang belum terjadi.');
  if (date < addDaysISO_(todayISO_(), -400)) throw userError_('DATE_OLD', 'Tanggal terlalu lama.');

  var patch = payload.patch || {};
  var current = ramadhanPayload_(user, profile, date).day;
  var next = {
    tarawihRakaat:
      patch.tarawihRakaat !== undefined ? clamp_(patch.tarawihRakaat, 0, 36, current.tarawihRakaat) : current.tarawihRakaat,
    tadarusPages:
      patch.tadarusPages !== undefined ? clamp_(patch.tadarusPages, 0, 60, current.tadarusPages) : current.tadarusPages,
    itikaf: patch.itikaf !== undefined ? Boolean(patch.itikaf) : current.itikaf,
    sedekah: patch.sedekah !== undefined ? clamp_(patch.sedekah, 0, 1000000000, current.sedekah) : current.sedekah,
    zakatPaid: patch.zakatPaid !== undefined ? Boolean(patch.zakatPaid) : current.zakatPaid,
    zakatAmount:
      patch.zakatAmount !== undefined ? clamp_(patch.zakatAmount, 0, 1000000000, current.zakatAmount) : current.zakatAmount,
    note: patch.note !== undefined ? clean_(patch.note, 200) : current.note
  };

  var logId = user.id + '|' + date;

  withLock_(function () {
    var exists = false;
    var rows = readTable_('RamadhanLog');
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].log_id) === logId) {
        exists = true;
        break;
      }
    }

    var record = {
      tarawih_rakaat: next.tarawihRakaat,
      tadarus_pages: next.tadarusPages,
      itikaf: next.itikaf ? 'TRUE' : 'FALSE',
      sedekah: next.sedekah,
      zakat_paid: next.zakatPaid ? 'TRUE' : 'FALSE',
      zakat_amount: next.zakatAmount,
      note: next.note,
      updated_at: nowIso_()
    };

    if (exists) {
      updateRow_('RamadhanLog', 'log_id', logId, record);
    } else {
      appendRow_('RamadhanLog', {
        log_id: logId,
        user_id: user.id,
        date: date,
        tarawih_rakaat: record.tarawih_rakaat,
        tadarus_pages: record.tadarus_pages,
        itikaf: record.itikaf,
        sedekah: record.sedekah,
        zakat_paid: record.zakat_paid,
        zakat_amount: record.zakat_amount,
        note: record.note,
        updated_at: record.updated_at
      });
    }
  });

  return ramadhanPayload_(user, profile, date);
}
