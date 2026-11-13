/**
 * Grup keluarga (akun pendamping).
 * Izin bersifat satu arah: pemilik akun (owner) dapat melihat RINGKASAN anggota
 * setelah anggota menerima undangan. Anggota dapat mencabut izin kapan saja.
 *
 * Yang tidak pernah dikirim ke pemilik: jurnal muhasabah, catatan, nominal
 * sedekah/zakat, dan detail per-ayat.
 */

var FAMILY_LIMIT = 5;

function maskEmail_(email) {
  var value = String(email || '');
  var at = value.indexOf('@');
  if (at < 1) return value || '—';
  return value.charAt(0) + '***' + value.slice(at);
}

function familyMemberName_(userId) {
  var profiles = readTable_('Profiles');
  for (var i = 0; i < profiles.length; i++) {
    if (String(profiles[i].user_id) === String(userId) && profiles[i].nama) return String(profiles[i].nama);
  }
  var users = readTable_('Users');
  for (var j = 0; j < users.length; j++) {
    if (String(users[j].user_id) === String(userId)) return String(users[j].nama || 'Anggota');
  }
  return 'Anggota';
}

function familyProfileFor_(userId) {
  var profiles = readTable_('Profiles');
  for (var i = 0; i < profiles.length; i++) {
    if (String(profiles[i].user_id) === String(userId)) return profiles[i];
  }
  return {
    user_id: userId,
    nama: familyMemberName_(userId),
    city_id: '1301',
    city_name: 'KOTA JAKARTA',
    offset_menit: 0,
    hijri_adj: 0,
    target_tilawah: 4,
    target_dzikir: 33,
    theme: 'light',
    notif_channel: 'calendar'
  };
}

function familyLastSeen_(userId) {
  var users = readTable_('Users');
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].user_id) === String(userId)) return String(users[i].last_seen || '');
  }
  return '';
}

function familySumQuran_(userId, days) {
  var from = addDaysISO_(todayISO_(), -(Math.max(1, days) - 1));
  var total = 0;
  readTable_('QuranLog').forEach(function (row) {
    if (String(row.user_id) !== String(userId)) return;
    var date = String(row.date);
    if (date < from) return;
    total += Number(row.pages) || 0;
  });
  return total;
}

function familySumDhikr_(userId, days) {
  var from = addDaysISO_(todayISO_(), -(Math.max(1, days) - 1));
  var total = 0;
  readTable_('DhikrLog').forEach(function (row) {
    if (String(row.user_id) !== String(userId)) return;
    var date = String(row.date);
    if (date < from) return;
    total += Number(row.count) || 0;
  });
  return total;
}

function familyFindLink_(linkId) {
  var rows = readTable_('Family');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].link_id) === String(linkId)) return rows[i];
  }
  return null;
}

function familyList_(user) {
  var rows = readTable_('Family');
  var members = [];
  var outgoing = [];
  var incoming = [];
  var myEmail = String(user.email || '').toLowerCase();

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var status = String(row.status || 'pending');
    if (status === 'revoked' || status === 'declined') continue;

    var isOwner = String(row.owner_id) === user.id;
    var ownerProfile = null;
    var memberProfile = null;

    if (isOwner && status === 'active') {
      memberProfile = familyProfileFor_(String(row.member_id));
      var stats7 = statsSummary_({ id: String(row.member_id) }, memberProfile, 7, todayISO_());
      members.push({
        id: String(row.link_id),
        name: String(memberProfile.nama || 'Anggota'),
        email: maskEmail_(row.member_email),
        since: String(row.updated_at || row.created_at || ''),
        percent7: stats7.percent,
        streak: stats7.streak,
        quran7: familySumQuran_(String(row.member_id), 7)
      });
    } else if (isOwner && status === 'pending') {
      outgoing.push({
        id: String(row.link_id),
        email: maskEmail_(row.member_email),
        createdAt: String(row.created_at || '')
      });
    } else if (!isOwner && status === 'pending' && String(row.member_email).toLowerCase() === myEmail) {
      ownerProfile = familyProfileFor_(String(row.owner_id));
      incoming.push({
        id: String(row.link_id),
        ownerName: String(ownerProfile.nama || 'Pengundang'),
        createdAt: String(row.created_at || '')
      });
    }
  }

  return {
    members: members,
    outgoing: outgoing,
    incoming: incoming,
    maxMembers: FAMILY_LIMIT,
    myEmail: maskEmail_(user.email)
  };
}

function inviteFamily_(user, payload) {
  var email = String(payload.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw userError_('BAD_EMAIL', 'Alamat email tidak valid.');
  }
  if (email === String(user.email || '').toLowerCase() || emailId_(email) === user.id) {
    throw userError_('SELF_INVITE', 'Tidak bisa mengundang diri sendiri.');
  }

  var rows = readTable_('Family');
  var used = 0;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var status = String(row.status || 'pending');
    if (String(row.owner_id) !== user.id) continue;
    if (status === 'active' || status === 'pending') used++;
    if (status !== 'revoked' && status !== 'declined' && String(row.member_email).toLowerCase() === email) {
      throw userError_('DUPLICATE_INVITE', 'Email ini sudah diundang atau sudah menjadi anggota.');
    }
  }

  if (used >= FAMILY_LIMIT) {
    throw userError_('FAMILY_LIMIT', 'Maksimal ' + FAMILY_LIMIT + ' anggota per akun.');
  }

  withLock_(function () {
    appendRow_('Family', {
      link_id: user.id + '|' + Utilities.getUuid(),
      owner_id: user.id,
      member_email: email,
      member_id: emailId_(email),
      status: 'pending',
      created_at: nowIso_(),
      updated_at: nowIso_()
    });
  });

  return familyList_(user);
}

function respondFamily_(user, payload) {
  var link = familyFindLink_(payload.id);
  if (!link) throw userError_('NOT_FOUND', 'Undangan tidak ditemukan.');
  if (String(link.status) !== 'pending') throw userError_('ALREADY_HANDLED', 'Undangan ini sudah diproses.');

  var myEmail = String(user.email || '').toLowerCase();
  var invitedEmail = String(link.member_email || '').toLowerCase();
  if (!myEmail || invitedEmail !== myEmail) {
    throw userError_('FORBIDDEN', 'Undangan ini bukan untuk akun Anda.');
  }

  var accept = payload.accept === true || payload.accept === 'true';
  withLock_(function () {
    updateRow_('Family', 'link_id', String(link.link_id), {
      status: accept ? 'active' : 'declined',
      member_id: user.id,
      updated_at: nowIso_()
    });
  });

  return familyList_(user);
}

function removeFamily_(user, payload) {
  var link = familyFindLink_(payload.id);
  if (!link) throw userError_('NOT_FOUND', 'Anggota tidak ditemukan.');

  var isOwner = String(link.owner_id) === user.id;
  var isMember = String(link.member_email || '').toLowerCase() === String(user.email || '').toLowerCase();
  if (!isOwner && !isMember) throw userError_('FORBIDDEN', 'Anda tidak berhak mengubah tautan ini.');

  withLock_(function () {
    updateRow_('Family', 'link_id', String(link.link_id), { status: 'revoked', updated_at: nowIso_() });
  });

  return familyList_(user);
}

function familyMember_(user, payload) {
  var link = familyFindLink_(payload.id);
  if (!link) throw userError_('NOT_FOUND', 'Anggota tidak ditemukan.');
  if (String(link.owner_id) !== user.id) throw userError_('FORBIDDEN', 'Hanya pemilik akun yang dapat melihat ringkasan ini.');
  if (String(link.status) !== 'active') throw userError_('FORBIDDEN', 'Izin anggota ini belum aktif atau sudah dicabut.');

  var memberId = String(link.member_id);
  var profile = familyProfileFor_(memberId);
  var pseudoUser = { id: memberId };
  var stats7 = statsSummary_(pseudoUser, profile, 7, todayISO_());
  var stats30 = statsSummary_(pseudoUser, profile, 30, todayISO_());
  var heatmap = [];
  for (var i = 13; i >= 0; i--) {
    var iso = addDaysISO_(todayISO_(), -i);
    var day = null;
    for (var k = 0; k < stats30.heatmap.length; k++) {
      if (stats30.heatmap[k].date === iso) {
        day = stats30.heatmap[k];
        break;
      }
    }
    heatmap.push({ date: iso, score: day ? day.score : 0 });
  }

  return {
    id: String(link.link_id),
    name: String(profile.nama || 'Anggota'),
    email: maskEmail_(link.member_email),
    since: String(link.updated_at || link.created_at || ''),
    lastSeen: familyLastSeen_(memberId),
    summary: {
      percent7: stats7.percent,
      percent30: stats30.percent,
      streak: stats30.streak,
      quranPages7: familySumQuran_(memberId, 7),
      dhikr7: familySumDhikr_(memberId, 7),
      done7: stats7.donePrayers,
      total7: stats7.totalPrayers,
      heatmap: heatmap
    }
  };
}
