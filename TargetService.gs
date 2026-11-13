/**
 * Target bersama — misi hafalan yang dipantau pendamping dan anak.
 *
 * Satu target dimiliki oleh pemilik akun (owner) dan ditujukan ke anggota
 * keluarga yang izinnya sudah aktif, atau ke diri sendiri. Keduanya dapat
 * mencentang misi; tanda selesai menyimpan siapa yang mencentang dan kapan.
 *
 * Yang dibagikan hanya judul target, daftar misi, dan status centang.
 * Jurnal muhasabah, catatan pribadi, dan nominal sedekah/zakat tidak pernah ikut.
 */

var TARGET_LIMIT = 12;
var TARGET_CREATE_MISSIONS = 10;
var MISSION_LIMIT = 20;
var TARGET_TITLE_MAX = 80;
var MISSION_LABEL_MAX = 120;

function targetFind_(targetId) {
  var rows = readTable_('Targets');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].target_id) === String(targetId)) return rows[i];
  }
  return null;
}

function targetIsDone_(value) {
  return value === true || String(value).toUpperCase() === 'TRUE';
}

/** Peran pengguna pada target: 'owner', 'member', atau '' bila tidak berhak. */
function targetRole_(row, user) {
  if (String(row.owner_id) === user.id) return 'owner';
  if (String(row.member_id) === user.id) return 'member';
  return '';
}

function targetMissionsFor_(targetId) {
  var rows = readTable_('TargetMissions');
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].target_id) === String(targetId)) out.push(rows[i]);
  }
  out.sort(function (a, b) {
    return (Number(a.position) || 0) - (Number(b.position) || 0);
  });
  return out;
}

function targetDoneByLabel_(doneBy, ownerId) {
  if (!doneBy) return '';
  if (String(doneBy) === String(ownerId)) return 'Pendamping';
  return familyMemberName_(doneBy) || 'Anggota';
}

function targetDto_(row, user) {
  var missions = targetMissionsFor_(row.target_id).map(function (mission) {
    return {
      id: String(mission.mission_id),
      label: String(mission.label || ''),
      done: targetIsDone_(mission.done),
      doneBy: targetDoneByLabel_(mission.done_by, row.owner_id),
      doneAt: String(mission.done_at || '')
    };
  });

  var done = 0;
  for (var i = 0; i < missions.length; i++) {
    if (missions[i].done) done++;
  }
  var total = missions.length;
  var role = targetRole_(row, user);

  return {
    id: String(row.target_id),
    title: String(row.title || ''),
    note: String(row.note || ''),
    dueDate: String(row.due_date || ''),
    role: role,
    ownerName: familyMemberName_(row.owner_id),
    memberName: familyMemberName_(row.member_id),
    forSelf: String(row.owner_id) === String(row.member_id),
    missions: missions,
    done: done,
    total: total,
    percent: total ? Math.round((done / total) * 100) : 0,
    complete: total > 0 && done === total,
    canRemove: role === 'owner'
  };
}

function targetList_(user) {
  var rows = readTable_('Targets');
  var targets = [];

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].status) === 'archived') continue;
    if (!targetRole_(rows[i], user)) continue;
    targets.push(targetDto_(rows[i], user));
  }

  targets.sort(function (a, b) {
    if (a.complete !== b.complete) return a.complete ? 1 : -1;
    return String(a.dueDate || '9999-12-31') < String(b.dueDate || '9999-12-31') ? -1 : 1;
  });

  var members = [];
  var family = readTable_('Family');
  for (var j = 0; j < family.length; j++) {
    var link = family[j];
    if (String(link.owner_id) !== user.id || String(link.status) !== 'active') continue;
    members.push({
      id: String(link.link_id),
      name: familyMemberName_(link.member_id),
      email: maskEmail_(link.member_email)
    });
  }

  return { targets: targets, members: members, maxTargets: TARGET_LIMIT, maxMissions: MISSION_LIMIT };
}

function createTarget_(user, payload) {
  var title = clean_(payload.title || '', TARGET_TITLE_MAX).trim();
  if (title.length < 3) throw userError_('BAD_TITLE', 'Judul target minimal 3 karakter.');

  var dueDate = String(payload.dueDate || '');
  if (dueDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw userError_('BAD_DATE', 'Tanggal tenggat tidak valid.');
    if (dueDate < todayISO_()) throw userError_('DATE_OLD', 'Tenggat tidak boleh di masa lalu.');
    if (dueDate > addDaysISO_(todayISO_(), 730)) throw userError_('DATE_FAR', 'Tenggat maksimal 2 tahun ke depan.');
  }

  var labels = [];
  var raw = payload.missions;
  if (Object.prototype.toString.call(raw) === '[object Array]') {
    for (var i = 0; i < raw.length && labels.length < TARGET_CREATE_MISSIONS; i++) {
      var label = clean_(raw[i] || '', MISSION_LABEL_MAX).trim();
      if (label && labels.indexOf(label) < 0) labels.push(label);
    }
  }
  if (!labels.length) throw userError_('NO_MISSION', 'Tambahkan minimal satu misi hafalan.');

  var memberId = user.id;
  var memberEmail = String(user.email || '');
  if (payload.memberId) {
    var link = familyFindLink_(payload.memberId);
    if (!link || String(link.owner_id) !== user.id || String(link.status) !== 'active') {
      throw userError_('BAD_MEMBER', 'Anggota keluarga tidak ditemukan atau izinnya belum aktif.');
    }
    memberId = String(link.member_id);
    memberEmail = String(link.member_email || '');
  }

  var used = 0;
  var rows = readTable_('Targets');
  for (var k = 0; k < rows.length; k++) {
    if (String(rows[k].owner_id) === user.id && String(rows[k].status) === 'active') used++;
  }
  if (used >= TARGET_LIMIT) {
    throw userError_('TARGET_LIMIT', 'Maksimal ' + TARGET_LIMIT + ' target aktif. Tuntaskan atau hapus target lama dulu.');
  }

  var targetId = user.id + '|' + Utilities.getUuid();
  var now = nowIso_();

  withLock_(function () {
    appendRow_('Targets', {
      target_id: targetId,
      owner_id: user.id,
      member_id: memberId,
      member_email: memberEmail,
      title: title,
      note: clean_(payload.note || '', 240),
      due_date: dueDate,
      status: 'active',
      created_at: now,
      updated_at: now
    });

    for (var m = 0; m < labels.length; m++) {
      appendRow_('TargetMissions', {
        mission_id: targetId + '|' + Utilities.getUuid(),
        target_id: targetId,
        label: labels[m],
        done: 'FALSE',
        done_by: '',
        done_at: '',
        position: m,
        created_at: now,
        updated_at: now
      });
    }
  });

  return targetList_(user);
}

function toggleTargetMission_(user, payload) {
  var target = targetFind_(payload.targetId);
  if (!target) throw userError_('NOT_FOUND', 'Target tidak ditemukan.');
  if (!targetRole_(target, user)) throw userError_('FORBIDDEN', 'Anda tidak berhak mengubah target ini.');
  if (String(target.status) === 'archived') throw userError_('TARGET_CLOSED', 'Target ini sudah dihapus.');

  var missions = readTable_('TargetMissions');
  var mission = null;
  for (var i = 0; i < missions.length; i++) {
    if (String(missions[i].mission_id) === String(payload.missionId) && String(missions[i].target_id) === String(target.target_id)) {
      mission = missions[i];
      break;
    }
  }
  if (!mission) throw userError_('NOT_FOUND', 'Misi tidak ditemukan pada target ini.');

  var done = typeof payload.done === 'boolean' ? payload.done : !targetIsDone_(mission.done);

  withLock_(function () {
    updateRow_('TargetMissions', 'mission_id', String(mission.mission_id), {
      done: done ? 'TRUE' : 'FALSE',
      done_by: done ? user.id : '',
      done_at: done ? nowIso_() : '',
      updated_at: nowIso_()
    });
  });

  var all = targetMissionsFor_(target.target_id);
  var complete = all.length > 0;
  for (var k = 0; k < all.length; k++) {
    if (!targetIsDone_(all[k].done)) {
      complete = false;
      break;
    }
  }

  withLock_(function () {
    updateRow_('Targets', 'target_id', String(target.target_id), {
      status: complete ? 'done' : 'active',
      updated_at: nowIso_()
    });
  });

  return targetList_(user);
}

function addTargetMission_(user, payload) {
  var target = targetFind_(payload.targetId);
  if (!target) throw userError_('NOT_FOUND', 'Target tidak ditemukan.');
  if (!targetRole_(target, user)) throw userError_('FORBIDDEN', 'Anda tidak berhak mengubah target ini.');
  if (String(target.status) === 'archived') throw userError_('TARGET_CLOSED', 'Target ini sudah dihapus.');

  var label = clean_(payload.label || '', MISSION_LABEL_MAX).trim();
  if (!label) throw userError_('BAD_LABEL', 'Tulis misi yang ingin ditambahkan.');

  var existing = targetMissionsFor_(target.target_id);
  if (existing.length >= MISSION_LIMIT) {
    throw userError_('MISSION_LIMIT', 'Maksimal ' + MISSION_LIMIT + ' misi per target.');
  }
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i].label).toLowerCase() === label.toLowerCase()) {
      throw userError_('DUPLICATE_MISSION', 'Misi ini sudah ada di target.');
    }
  }

  var now = nowIso_();
  withLock_(function () {
    appendRow_('TargetMissions', {
      mission_id: String(target.target_id) + '|' + Utilities.getUuid(),
      target_id: String(target.target_id),
      label: label,
      done: 'FALSE',
      done_by: '',
      done_at: '',
      position: existing.length,
      created_at: now,
      updated_at: now
    });
  });

  if (String(target.status) === 'done') {
    withLock_(function () {
      updateRow_('Targets', 'target_id', String(target.target_id), { status: 'active', updated_at: now });
    });
  }

  return targetList_(user);
}

function removeTarget_(user, payload) {
  var target = targetFind_(payload.targetId);
  if (!target) throw userError_('NOT_FOUND', 'Target tidak ditemukan.');
  if (String(target.owner_id) !== user.id) {
    throw userError_('FORBIDDEN', 'Hanya pembuat target yang dapat menghapusnya.');
  }

  withLock_(function () {
    updateRow_('Targets', 'target_id', String(target.target_id), {
      status: 'archived',
      updated_at: nowIso_()
    });
  });

  return targetList_(user);
}
