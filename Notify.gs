/**
 * Pengingat & laporan berkala.
 * Web app Apps Script tidak bisa push notification, jadi pengingat memakai
 * Google Calendar (notifikasi native di HP) dan email ringkasan mingguan.
 * Kuota trigger: 90 menit/hari (akun consumer) — jaga setiap job tetap ringan.
 */

function installTriggers_() {
  removeTriggers_();

  ScriptApp.newTrigger('dailyCalendarJob_').timeBased().atHour(4).nearMinute(10).create();
  ScriptApp.newTrigger('weeklyReportJob_')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(6)
    .create();

  return 'Trigger dipasang: dailyCalendarJob_ (04:10) & weeklyReportJob_ (Senin 06:00).';
}

function removeTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    var fn = trigger.getHandlerFunction();
    if (fn === 'dailyCalendarJob_' || fn === 'weeklyReportJob_') ScriptApp.deleteTrigger(trigger);
  });
  return 'Trigger IbadahKu dihapus.';
}

function dailyCalendarJob_() {
  var started = Date.now();
  var profiles = readTable_('Profiles');

  for (var i = 0; i < profiles.length; i++) {
    if (Date.now() - started > 240000) break; // batas aman 4 menit
    var row = profiles[i];
    if (String(row.notif_channel) !== 'calendar') continue;
    try {
      syncCalendar_(row);
    } catch (err) {
      // satu pengguna gagal tidak boleh menghentikan yang lain
    }
  }
}

function syncCalendar_(row) {
  var calendar = getOrCreateCalendar_('IbadahKu');
  var today = todayISO_();

  for (var d = 0; d < 7; d++) {
    var iso = addDaysISO_(today, d);
    var schedule = daySchedule_(row.city_id, row.city_name, iso, row.offset_menit);
    if (!schedule) continue;

    for (var k = 0; k < PRAYER_KEYS.length; k++) {
      var key = PRAYER_KEYS[k];
      var time = schedule[key];
      if (!time) continue;

      var parts = String(time).split(':');
      var start = parseISO_(iso);
      start.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
      var end = new Date(start.getTime() + 20 * 60000);
      var title = 'Sholat ' + key.charAt(0).toUpperCase() + key.slice(1);

      var existing = calendar.getEvents(start, end, { search: title });
      if (existing.length) continue;

      calendar.createEvent(title, start, end, {
        description: 'IbadahKu · ' + (row.city_name || '') + ' · jadwal bersifat perkiraan',
        reminders: [CalendarApp.newReminder().setMethod('popup').setMinutesBefore(10)]
      });
    }
  }
}

function getOrCreateCalendar_(name) {
  var found = CalendarApp.getCalendarsByName(name);
  if (found.length) return found[0];
  return CalendarApp.createCalendar(name, { summary: 'Jadwal sholat dari IbadahKu' });
}

function weeklyReportJob_() {
  var started = Date.now();
  var users = readTable_('Users');
  var profiles = readTable_('Profiles');

  for (var i = 0; i < users.length; i++) {
    if (Date.now() - started > 240000) break;
    var email = String(users[i].email || '');
    if (!email) continue;

    var profile = null;
    for (var j = 0; j < profiles.length; j++) {
      if (String(profiles[j].user_id) === String(users[i].user_id)) {
        profile = profiles[j];
        break;
      }
    }
    if (!profile || String(profile.notif_channel) !== 'email') continue;

    try {
      var stats = statsSummary_({ id: users[i].user_id, email: email }, profile, 7, todayISO_());
      var quran = quranSummary_({ id: users[i].user_id }, profile);
      var body =
        'Assalamualaikum ' + (profile.nama || 'Sahabat') + ',\n\n' +
        'Ringkasan ibadah 7 hari terakhir (' + stats.from + ' s.d. ' + stats.to + '):\n' +
        '• Kepatuhan sholat: ' + stats.percent + '% (' + stats.donePrayers + '/' + stats.totalPrayers + ')\n' +
        '• Streak: ' + stats.streak + ' hari\n' +
        '• Status: jamaah ' + stats.composition.jamaah + ', tepat ' + stats.composition.tepat + ', qadha ' + stats.composition.qadha + '\n' +
        '• Tilawah total: ' + quran.totalPages + ' halaman (' + quran.khatamPct + '% khatam)\n\n' +
        'Jangan menyerah pada amal kecil yang konsisten.\n— IbadahKu';

      MailApp.sendEmail(email, 'Ringkasan ibadah mingguan — IbadahKu', body);
    } catch (err) {
      // kuota email habis atau alamat tidak valid: lanjut ke pengguna berikutnya
    }
  }
}
