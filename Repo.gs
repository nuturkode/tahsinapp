/**
 * Lapisan akses data (Google Sheets sebagai database).
 * Semua penulisan dibungkus LockService agar tidak saling menimpa.
 */

var SCHEMA = {
  Users: ['user_id', 'email', 'nama', 'role', 'created_at', 'last_seen'],
  Profiles: [
    'user_id',
    'nama',
    'city_id',
    'city_name',
    'offset_menit',
    'hijri_adj',
    'target_tilawah',
    'target_dzikir',
    'theme',
    'notif_channel',
    'updated_at',
    'card_palette',
    'card_theme',
    'card_show_name'
  ],
  PrayerLog: ['log_id', 'user_id', 'date', 'prayer', 'status', 'note', 'updated_at'],
  SunnahLog: ['log_id', 'user_id', 'date', 'type', 'count', 'updated_at'],
  QuranLog: ['log_id', 'user_id', 'date', 'surah', 'ayah_from', 'ayah_to', 'pages', 'mode', 'note', 'updated_at'],
  DhikrLog: ['log_id', 'user_id', 'date', 'preset_id', 'count', 'updated_at'],
  FastingLog: ['log_id', 'user_id', 'date', 'type', 'status', 'updated_at'],
  Journal: ['log_id', 'user_id', 'date', 'syukur', 'muhasabah', 'doa', 'mood', 'updated_at'],
  Qadha: ['log_id', 'user_id', 'kind', 'remaining', 'updated_at'],
  Hafalan: [
    'log_id',
    'user_id',
    'surah',
    'ayah_from',
    'ayah_to',
    'juz',
    'status',
    'score',
    'interval_index',
    'next_review',
    'created_at',
    'updated_at'
  ],
  RamadhanLog: [
    'log_id',
    'user_id',
    'date',
    'tarawih_rakaat',
    'tadarus_pages',
    'itikaf',
    'sedekah',
    'zakat_paid',
    'zakat_amount',
    'note',
    'updated_at'
  ],
  Family: ['link_id', 'owner_id', 'member_email', 'member_id', 'status', 'created_at', 'updated_at'],
  Targets: [
    'target_id',
    'owner_id',
    'member_id',
    'member_email',
    'title',
    'note',
    'due_date',
    'status',
    'created_at',
    'updated_at'
  ],
  TargetMissions: [
    'mission_id',
    'target_id',
    'label',
    'done',
    'done_by',
    'done_at',
    'position',
    'created_at',
    'updated_at'
  ],
  PrayerCache: ['cache_key', 'payload_json', 'fetched_at'],
  AuditLog: ['ts', 'user_id', 'action', 'ms', 'ok', 'err']
};

function db_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      props.deleteProperty('SPREADSHEET_ID');
    }
  }
  var ss = SpreadsheetApp.create('IbadahKu Database');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function sheet_(name) {
  if (!SCHEMA[name]) throw new Error('Sheet tidak dikenal: ' + name);
  var ss = db_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, SCHEMA[name].length).setFontWeight('bold');
  } else {
    ensureColumns_(sheet, name);
  }
  return sheet;
}

/** Menambahkan kolom baru di akhir header tanpa menggeser data lama (migrasi ringan). */
function ensureColumns_(sheet, name) {
  var headers = SCHEMA[name];
  var lastCol = Math.max(1, sheet.getLastColumn());
  var existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (value) {
    return String(value);
  });
  var missing = headers.filter(function (header) {
    return existing.indexOf(header) < 0;
  });
  if (!missing.length) return;
  sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
}

function ensureSheets_() {
  Object.keys(SCHEMA).forEach(function (name) {
    sheet_(name);
  });
  var ss = db_();
  var first = ss.getSheetByName('Sheet1');
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function readTable_(name) {
  var sheet = sheet_(name);
  var last = sheet.getLastRow();
  var headers = SCHEMA[name];
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var row = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      var value = values[i][c];
      row[headers[c]] = value instanceof Date ? value.toISOString() : value;
      if (value !== '' && value !== null) empty = false;
    }
    if (!empty) rows.push(row);
  }
  return rows;
}

function appendRow_(name, obj) {
  var sheet = sheet_(name);
  var headers = SCHEMA[name];
  var row = headers.map(function (key) {
    return obj[key] === undefined || obj[key] === null ? '' : obj[key];
  });
  sheet.appendRow(row);
}

function updateRow_(name, idField, idValue, patch) {
  var sheet = sheet_(name);
  var headers = SCHEMA[name];
  var idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw new Error('Kolom ' + idField + ' tidak ada di ' + name);
  var last = sheet.getLastRow();
  if (last < 2) return false;

  var ids = sheet.getRange(2, idIndex + 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(idValue)) {
      var rowIndex = i + 2;
      Object.keys(patch).forEach(function (key) {
        var col = headers.indexOf(key);
        if (col >= 0) sheet.getRange(rowIndex, col + 1).setValue(patch[key]);
      });
      return true;
    }
  }
  return false;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function cacheGet_(key) {
  try {
    var raw = CacheService.getScriptCache().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function cachePut_(key, value, seconds) {
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(value), seconds || 3600);
  } catch (err) {
    // payload > 100 KB: lewati cache memori, sheet cache tetap dipakai
  }
}

function sheetCacheGet_(key) {
  var rows = readTable_('PrayerCache');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].cache_key) === String(key)) {
      try {
        return JSON.parse(rows[i].payload_json);
      } catch (err) {
        return null;
      }
    }
  }
  return null;
}

function sheetCachePut_(key, payload) {
  var json = JSON.stringify(payload);
  if (json.length > 45000) return; // batas sel aman
  var rows = readTable_('PrayerCache');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].cache_key) === String(key)) {
      updateRow_('PrayerCache', 'cache_key', key, { payload_json: json, fetched_at: nowIso_() });
      return;
    }
  }
  appendRow_('PrayerCache', { cache_key: key, payload_json: json, fetched_at: nowIso_() });
}

function audit_(user, action, ms, ok, err) {
  try {
    appendRow_('AuditLog', {
      ts: nowIso_(),
      user_id: user ? user.id : '',
      action: clean_(action, 40),
      ms: ms,
      ok: ok ? 'TRUE' : 'FALSE',
      err: clean_(err, 200)
    });
  } catch (e) {
    // audit tidak boleh menggagalkan permintaan
  }
}
