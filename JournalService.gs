/** Jurnal muhasabah harian (data pribadi, tidak pernah dibagikan). */

function saveJournal_(user, payload) {
  var date = payload.date ? String(payload.date) : todayISO_();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw userError_('BAD_DATE', 'Tanggal jurnal tidak valid.');
  if (date > todayISO_()) throw userError_('DATE_FUTURE', 'Tidak bisa menulis jurnal untuk tanggal yang belum terjadi.');

  var logId = user.id + '|' + date;
  var changes = {
    syukur: clean_(payload.syukur, 2000),
    muhasabah: clean_(payload.muhasabah, 2000),
    doa: clean_(payload.doa, 2000),
    updated_at: nowIso_()
  };

  withLock_(function () {
    var exists = false;
    var rows = readTable_('Journal');
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].log_id) === logId) {
        exists = true;
        break;
      }
    }
    if (exists) {
      updateRow_('Journal', 'log_id', logId, changes);
    } else {
      appendRow_('Journal', {
        log_id: logId,
        user_id: user.id,
        date: date,
        syukur: changes.syukur,
        muhasabah: changes.muhasabah,
        doa: changes.doa,
        mood: '',
        updated_at: changes.updated_at
      });
    }
  });

  return { saved: true, journal: { date: date, syukur: changes.syukur, muhasabah: changes.muhasabah, doa: changes.doa } };
}

function getJournal_(user, payload) {
  var date = payload.date ? String(payload.date) : todayISO_();
  var rows = readTable_('Journal');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].user_id) === user.id && String(rows[i].date) === date) {
      return {
        journal: {
          date: date,
          syukur: String(rows[i].syukur || ''),
          muhasabah: String(rows[i].muhasabah || ''),
          doa: String(rows[i].doa || '')
        }
      };
    }
  }
  return { journal: null };
}
