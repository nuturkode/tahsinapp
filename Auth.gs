/** Identitas pengguna & profil. */

function currentUser_() {
  var email = '';
  try {
    email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  } catch (err) {
    email = '';
  }

  var id = email ? emailId_(email) : 'demo';
  var users = readTable_('Users');
  var found = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].user_id) === id) {
      found = users[i];
      break;
    }
  }

  if (!found) {
    found = {
      user_id: id,
      email: email,
      nama: email ? email.split('@')[0] : 'Tamu',
      role: 'user',
      created_at: nowIso_(),
      last_seen: nowIso_()
    };
    appendRow_('Users', found);
  } else {
    // last_seen cukup diperbarui tiap beberapa jam, tidak setiap request:
    // setiap updateRow_ adalah tulis sheet yang memperlambat semua load/save.
    var seen = Date.parse(String(found.last_seen || ''));
    if (!seen || isNaN(seen) || Date.now() - seen > 6 * 3600 * 1000) {
      updateRow_('Users', 'user_id', id, { last_seen: nowIso_() });
    }
  }

  return { id: id, email: email, nama: found.nama, role: found.role, demo: !email };
}

function defaultProfile_(user) {
  return {
    user_id: user.id,
    nama: user.nama || 'Sahabat',
    city_id: '1301',
    city_name: 'KOTA JAKARTA',
    offset_menit: 0,
    hijri_adj: 0,
    target_tilawah: 4,
    target_dzikir: 33,
    theme: 'light',
    notif_channel: 'calendar',
    updated_at: nowIso_(),
    card_palette: 'emerald',
    card_theme: 'dark',
    card_show_name: 'TRUE'
  };
}

function profileDto_(row) {
  return {
    nama: row.nama || '',
    cityId: String(row.city_id || '1301'),
    cityName: row.city_name || '',
    offsetMenit: Number(row.offset_menit) || 0,
    hijriAdj: Number(row.hijri_adj) || 0,
    targetTilawah: Number(row.target_tilawah) || 4,
    targetDzikir: Number(row.target_dzikir) || 33,
    theme: row.theme === 'dark' ? 'dark' : 'light',
    notifChannel: row.notif_channel || 'calendar',
    cardPalette: row.card_palette || 'emerald',
    cardTheme: row.card_theme === 'light' ? 'light' : 'dark',
    cardShowName: row.card_show_name === '' || row.card_show_name === undefined ? true : asBool_(row.card_show_name)
  };
}

function getProfile_(user) {
  var rows = readTable_('Profiles');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].user_id) === user.id) return rows[i];
  }
  var created = defaultProfile_(user);
  appendRow_('Profiles', created);
  return created;
}

function saveProfile_(user, patch) {
  if (!patch || typeof patch !== 'object') throw userError_('BAD_PAYLOAD', 'Data profil tidak valid.');

  var current = getProfile_(user);
  var changes = { updated_at: nowIso_() };

  if (patch.nama !== undefined) changes.nama = clean_(patch.nama, 40);
  if (patch.cityId !== undefined) changes.city_id = clean_(patch.cityId, 12);
  if (patch.cityName !== undefined) changes.city_name = clean_(patch.cityName, 60).toUpperCase();
  if (patch.offsetMenit !== undefined) changes.offset_menit = clamp_(patch.offsetMenit, -10, 10, 0);
  if (patch.hijriAdj !== undefined) changes.hijri_adj = clamp_(patch.hijriAdj, -2, 2, 0);
  if (patch.targetTilawah !== undefined) changes.target_tilawah = clamp_(patch.targetTilawah, 1, 60, 4);
  if (patch.targetDzikir !== undefined) changes.target_dzikir = clamp_(patch.targetDzikir, 1, 999, 33);
  if (patch.theme !== undefined) changes.theme = patch.theme === 'dark' ? 'dark' : 'light';
  if (patch.notifChannel !== undefined) {
    changes.notif_channel = ['calendar', 'email', 'none'].indexOf(patch.notifChannel) >= 0 ? patch.notifChannel : 'calendar';
  }
  if (patch.cardPalette !== undefined) {
    var palette = String(patch.cardPalette);
    changes.card_palette = ['emerald', 'gold', 'ocean', 'rose', 'ink'].indexOf(palette) >= 0 ? palette : 'emerald';
  }
  if (patch.cardTheme !== undefined) {
    changes.card_theme = patch.cardTheme === 'light' ? 'light' : 'dark';
  }
  if (patch.cardShowName !== undefined) {
    changes.card_show_name = patch.cardShowName ? 'TRUE' : 'FALSE';
  }

  withLock_(function () {
    updateRow_('Profiles', 'user_id', user.id, changes);
  });

  return getProfile_(user);
}
