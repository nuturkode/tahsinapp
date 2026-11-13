/**
 * Router API tunggal.
 * Frontend memanggil: google.script.run.api('bootstrap', '{"...":...}')
 * Respons selalu JSON string: { ok, data } atau { ok:false, error:{code,message} }
 */

function api(action, payloadJson) {
  var started = Date.now();
  var user = null;

  try {
    ensureSheets_();
    user = currentUser_();

    var payload = {};
    if (payloadJson) {
      try {
        payload = JSON.parse(payloadJson) || {};
      } catch (err) {
        throw userError_('BAD_PAYLOAD', 'Data permintaan tidak valid.');
      }
    }

    var name = String(action || '');
    var handler = ROUTES[name];
    if (!handler) throw userError_('UNKNOWN_ACTION', 'Aksi tidak dikenali: ' + name);

    var data = handler(payload, user) || {};
    var ms = Date.now() - started;
    audit_(user, name, ms, true, '');
    return envelope_(data, ms);
  } catch (err) {
    var msFail = Date.now() - started;
    var isUser = !!(err && err.isUserError);
    audit_(user, String(action || ''), msFail, false, (err && err.message) || String(err));
    return failEnvelope_(
      isUser ? err.code : 'SERVER_ERROR',
      isUser ? err.message : 'Terjadi kesalahan di server. Coba lagi sebentar.',
      msFail
    );
  }
}

var ROUTES = {
  bootstrap: function (payload, user) {
    var profile = getProfile_(user);
    var today = todayISO_();
    var schedule = daySchedule_(profile.city_id, profile.city_name, today, profile.offset_menit);
    var stats = statsSummary_(user, profile, 30, today);

    return {
      demo: user.demo,
      profile: profileDto_(profile),
      today: {
        date: today,
        hijri: hijriFromISO_(today, profile.hijri_adj),
        schedule: schedule,
        cityName: profile.city_name,
        source: 'Kemenag (myQuran)'
      },
      marks: marksFor_(user, today),
      streak: stats.streak,
      quran: quranSummary_(user, profile),
      dhikr: dhikrSummary_(user, profile),
      sunnah: sunnahCounts_(user, today),
      qadha: qadhaList_(user),
      hafalan: hafalanList_(user),
      stats: stats
    };
  },

  'city.list': function () {
    return { cities: cityList_(), source: 'myquran' };
  },

  'prayer.month': function (payload, user) {
    var profile = getProfile_(user);
    var year = clamp_(payload.year, 2000, 2100, Number(todayISO_().slice(0, 4)));
    var month = clamp_(payload.month, 1, 12, Number(todayISO_().slice(5, 7)));
    return prayerMonthDto_(user, profile, year, month);
  },

  'prayer.mark': function (payload, user) {
    var date = String(payload.date || todayISO_());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw userError_('BAD_DATE', 'Tanggal tidak valid.');
    if (date > todayISO_()) throw userError_('DATE_FUTURE', 'Tidak bisa mencatat tanggal yang belum terjadi.');
    if (date < addDaysISO_(todayISO_(), -365)) throw userError_('DATE_OLD', 'Tanggal terlalu lama (maksimal 1 tahun).');
    if (PRAYER_KEYS.indexOf(String(payload.prayer)) < 0) throw userError_('BAD_PRAYER', 'Waktu sholat tidak dikenali.');

    var status = payload.status == null ? '' : String(payload.status);
    if (status && STATUS_VALUES.indexOf(status) < 0) throw userError_('BAD_STATUS', 'Status sholat tidak valid.');

    var logId = user.id + '|' + date + '|' + payload.prayer;

    withLock_(function () {
      var exists = false;
      var rows = readTable_('PrayerLog');
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].log_id) === logId) {
          exists = true;
          break;
        }
      }
      if (exists) {
        updateRow_('PrayerLog', 'log_id', logId, { status: status, updated_at: nowIso_() });
      } else {
        appendRow_('PrayerLog', {
          log_id: logId,
          user_id: user.id,
          date: date,
          prayer: payload.prayer,
          status: status,
          note: '',
          updated_at: nowIso_()
        });
      }
    });

    return { date: date, marks: marksFor_(user, date), streak: streakFor_(user) };
  },

  'quran.log': function (payload, user) {
    var profile = getProfile_(user);
    var date = String(payload.date || todayISO_());
    if (date > todayISO_()) throw userError_('DATE_FUTURE', 'Tidak bisa mencatat tanggal yang belum terjadi.');

    var pages = clamp_(payload.pages, 1, 60, 1);
    var surah = clean_(payload.surah || 'Al-Fatihah', 60);
    var mode = QURAN_MODES.indexOf(String(payload.mode)) >= 0 ? String(payload.mode) : 'tilawah';

    var row = {
      log_id: user.id + '|' + Utilities.getUuid(),
      user_id: user.id,
      date: date,
      surah: surah,
      ayah_from: clamp_(payload.ayahFrom, 0, 300, 0),
      ayah_to: clamp_(payload.ayahTo, 0, 300, 0),
      pages: pages,
      mode: mode,
      note: '',
      updated_at: nowIso_()
    };

    withLock_(function () {
      appendRow_('QuranLog', row);
    });

    return {
      log: { date: date, surah: surah, ayahFrom: row.ayah_from, ayahTo: row.ayah_to, pages: pages, mode: mode },
      summary: quranSummary_(user, profile)
    };
  },

  'quran.logs': function (payload, user) {
    return { logs: quranLogs_(user) };
  },

  'quran.surahs': function () {
    return { surahs: surahs_() };
  },

  'dhikr.log': function (payload, user) {
    var profile = getProfile_(user);
    var date = String(payload.date || todayISO_());
    if (date > todayISO_()) throw userError_('DATE_FUTURE', 'Tidak bisa mencatat tanggal yang belum terjadi.');

    var count = clamp_(payload.count, 0, 9999, 0);
    var presetId = clean_(payload.presetId || 'umum', 24);
    var logId = user.id + '|' + date + '|' + presetId;

    withLock_(function () {
      var exists = false;
      var rows = readTable_('DhikrLog');
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].log_id) === logId) {
          exists = true;
          break;
        }
      }
      if (exists) {
        updateRow_('DhikrLog', 'log_id', logId, { count: count, updated_at: nowIso_() });
      } else {
        appendRow_('DhikrLog', {
          log_id: logId,
          user_id: user.id,
          date: date,
          preset_id: presetId,
          count: count,
          updated_at: nowIso_()
        });
      }
    });

    return { date: date, count: count, target: Number(profile.target_dzikir) || 33 };
  },

  'stats.summary': function (payload, user) {
    var profile = getProfile_(user);
    var days = clamp_(payload.days, 1, 365, 30);
    var end = payload.end ? String(payload.end) : todayISO_();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) throw userError_('BAD_DATE', 'Tanggal akhir tidak valid.');
    return statsSummary_(user, profile, days, end);
  },

  'sunnah.get': function (payload, user) {
    var date = String(payload.date || todayISO_());
    return { date: date, counts: sunnahCounts_(user, date) };
  },

  'sunnah.mark': function (payload, user) {
    return markSunnah_(user, payload);
  },

  'qadha.adjust': function (payload, user) {
    return adjustQadha_(user, payload);
  },

  'hafalan.list': function (payload, user) {
    return hafalanList_(user);
  },

  'hafalan.save': function (payload, user) {
    return saveHafalan_(user, payload);
  },

  'hafalan.review': function (payload, user) {
    return reviewHafalan_(user, payload);
  },

  'hijri.month': function (payload) {
    var year = clamp_(payload.year, 2000, 2100, Number(todayISO_().slice(0, 4)));
    var month = clamp_(payload.month, 1, 12, Number(todayISO_().slice(5, 7)));
    return hijriMonth_(year, month);
  },

  'family.list': function (payload, user) {
    return familyList_(user);
  },

  'family.invite': function (payload, user) {
    return inviteFamily_(user, payload);
  },

  'family.respond': function (payload, user) {
    return respondFamily_(user, payload);
  },

  'family.remove': function (payload, user) {
    return removeFamily_(user, payload);
  },

  'family.member': function (payload, user) {
    return familyMember_(user, payload);
  },

  'target.list': function (payload, user) {
    return targetList_(user);
  },

  'target.create': function (payload, user) {
    return createTarget_(user, payload);
  },

  'target.mission.toggle': function (payload, user) {
    return toggleTargetMission_(user, payload);
  },

  'target.mission.add': function (payload, user) {
    return addTargetMission_(user, payload);
  },

  'target.remove': function (payload, user) {
    return removeTarget_(user, payload);
  },

  'report.month': function (payload, user) {
    var profile = getProfile_(user);
    var year = clamp_(payload.year, 2000, 2100, Number(todayISO_().slice(0, 4)));
    var month = clamp_(payload.month, 1, 12, Number(todayISO_().slice(5, 7)));
    return monthlyReport_(user, profile, year, month);
  },

  'ramadhan.day': function (payload, user) {
    var profile = getProfile_(user);
    return ramadhanPayload_(user, profile, String(payload.date || todayISO_()));
  },

  'ramadhan.save': function (payload, user) {
    var profile = getProfile_(user);
    return saveRamadhan_(user, profile, payload);
  },

  'profile.save': function (payload, user) {
    var row = saveProfile_(user, payload);
    return { profile: profileDto_(row) };
  },

  'journal.save': function (payload, user) {
    return saveJournal_(user, payload);
  },

  'journal.get': function (payload, user) {
    return getJournal_(user, payload);
  },

  'export.month': function (payload, user) {
    var profile = getProfile_(user);
    var year = clamp_(payload.year, 2000, 2100, Number(todayISO_().slice(0, 4)));
    var month = clamp_(payload.month, 1, 12, Number(todayISO_().slice(5, 7)));
    var dto = prayerMonthDto_(user, profile, year, month);

    var lines = ['Tanggal;Subuh;Dzuhur;Ashar;Maghrib;Isya;Skor'];
    dto.days.forEach(function (day) {
      var marks = dto.marks[day.date] || {};
      var score = 0;
      var cells = PRAYER_KEYS.map(function (key) {
        if (marks[key]) score++;
        return marks[key] || '-';
      });
      lines.push([day.date].concat(cells).concat([score]).join(';'));
    });

    return { filename: 'ibadahku-' + year + '-' + pad2_(month) + '.csv', csv: lines.join('\n') };
  }
};
