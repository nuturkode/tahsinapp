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

/**
 * Versi skema. Naikkan angka ini setiap menambah kolom di SCHEMA supaya
 * kolom baru dipasang sekali, bukan dicek ulang di setiap permintaan.
 */
var SCHEMA_VERSION = '2026-11-14-1';

/**
 * Cache per eksekusi (satu eksekusi = satu permintaan API). Setiap panggilan
 * SpreadsheetApp adalah RPC jaringan, jadi objek spreadsheet, sheet, dan isi
 * tabel disimpan sekali saja selama satu permintaan.
 */
var DB_CACHE_ = null;
var SHEET_CACHE_ = {};
var TABLE_CACHE_ = {};
var SCHEMA_VERIFIED_ = false;

/** Audit hanya ditulis untuk permintaan gagal atau yang lambat. */
var AUDIT_SLOW_MS_ = 2500;

/**
 * Spreadsheet database milik akun yang sedang mengakses.
 *
 * Web app berjalan dengan `executeAs: USER_ACCESSING`, jadi seluruh kode
 * dieksekusi sebagai pengguna. Karena itu ID spreadsheet disimpan di
 * **User Properties** (satu nilai per akun). Versi sebelumnya memakai Script
 * Properties yang dipakai bersama semua akun: akun kedua gagal openById,
 * membuat spreadsheet baru, lalu menimpa ID bersama itu sehingga akun pertama
 * kehilangan datanya pada permintaan berikutnya.
 */
function db_() {
  if (DB_CACHE_) return DB_CACHE_;

  var ss = openSpreadsheet_();
  if (ss) {
    DB_CACHE_ = ss;
    return ss;
  }

  // Pembuatan database hanya terjadi sekali per akun. Kunci sebentar agar dua
  // permintaan pertama yang bersamaan tidak membuat dua spreadsheet.
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    locked = lock.tryLock(15000);
  } catch (err) {
    locked = false;
  }
  try {
    ss = openSpreadsheet_();
    if (ss) {
      DB_CACHE_ = ss;
      return ss;
    }
    var created = SpreadsheetApp.create('IbadahKu Database');
    PropertiesService.getUserProperties().setProperty('SPREADSHEET_ID', created.getId());
    DB_CACHE_ = created;
    return created;
  } finally {
    if (locked) lock.releaseLock();
  }
}

/** Spreadsheet tersimpan untuk akun ini; null bila belum ada atau tak bisa dibuka. */
function openSpreadsheet_() {
  var userProps = PropertiesService.getUserProperties();
  var id = userProps.getProperty('SPREADSHEET_ID');
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (err) {
      userProps.deleteProperty('SPREADSHEET_ID');
    }
  }

  // Migrasi sekali jalan dari versi lama (ID disimpan di Script Properties
  // bersama). Hanya akun yang benar-benar punya akses yang mengadopsinya;
  // akun lain dibiarkan membuat spreadsheet sendiri.
  var scriptProps = PropertiesService.getScriptProperties();
  var legacyId = scriptProps.getProperty('SPREADSHEET_ID');
  if (!legacyId) return null;
  try {
    var legacy = SpreadsheetApp.openById(legacyId);
    userProps.setProperty('SPREADSHEET_ID', legacyId);
    scriptProps.deleteProperty('SPREADSHEET_ID');
    return legacy;
  } catch (err) {
    return null;
  }
}

function sheet_(name) {
  if (!SCHEMA[name]) throw new Error('Sheet tidak dikenal: ' + name);
  if (SHEET_CACHE_[name]) return SHEET_CACHE_[name];

  var ss = db_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, SCHEMA[name].length).setFontWeight('bold');
  } else if (!SCHEMA_VERIFIED_) {
    ensureColumns_(sheet, name);
  }
  SHEET_CACHE_[name] = sheet;
  return sheet;
}

/**
 * Cek skema murah: hanya membaca User Properties. Pemeriksaan penuh (17 sheet
 * + header) dijalankan sekali saat database baru atau setelah SCHEMA_VERSION
 * berubah, bukan di setiap permintaan.
 */
function ensureSchema_() {
  var props = PropertiesService.getUserProperties();
  if (props.getProperty('SPREADSHEET_ID') && props.getProperty('SCHEMA_VERSION') === SCHEMA_VERSION) {
    SCHEMA_VERIFIED_ = true;
    return;
  }

  db_();
  ensureSheets_();
  props.setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
  SCHEMA_VERIFIED_ = true;
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
  TABLE_CACHE_ = {};
}

function readTable_(name) {
  if (TABLE_CACHE_[name]) return TABLE_CACHE_[name];

  var sheet = sheet_(name);
  var last = sheet.getLastRow();
  var headers = SCHEMA[name];
  if (last < 2) {
    TABLE_CACHE_[name] = [];
    return [];
  }
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
  TABLE_CACHE_[name] = rows;
  return rows;
}

function appendRow_(name, obj) {
  var sheet = sheet_(name);
  var headers = SCHEMA[name];
  var row = headers.map(function (key) {
    return obj[key] === undefined || obj[key] === null ? '' : obj[key];
  });
  sheet.appendRow(row);
  delete TABLE_CACHE_[name];
}

/** Perbandingan nilai sel: Date, boolean (TRUE/FALSE), dan angka disamakan. */
function sameCellValue_(current, next) {
  var left = current instanceof Date ? current.toISOString() : current;
  var right = next instanceof Date ? next.toISOString() : next;
  return String(left === null || left === undefined ? '' : left) === String(right === null || right === undefined ? '' : right);
}

function updateRow_(name, idField, idValue, patch) {
  var sheet = sheet_(name);
  var headers = SCHEMA[name];
  var idIndex = headers.indexOf(idField);
  if (idIndex < 0) throw new Error('Kolom ' + idField + ' tidak ada di ' + name);
  var last = sheet.getLastRow();
  if (last < 2) return false;

  var ids = sheet.getRange(2, idIndex + 1, last - 1, 1).getValues();
  var rowIndex = 0;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(idValue)) {
      rowIndex = i + 2;
      break;
    }
  }
  if (!rowIndex) return false;

  var keys = Object.keys(patch);
  if (!keys.length) return true;

  // Satu baca + satu tulis untuk semua kolom (sebelumnya satu setValue per kolom).
  var row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var min = -1;
  var max = -1;
  keys.forEach(function (key) {
    var col = headers.indexOf(key);
    if (col < 0) return;
    if (sameCellValue_(row[col], patch[key])) return;
    row[col] = patch[key];
    if (min < 0 || col < min) min = col;
    if (col > max) max = col;
  });
  if (min < 0) return true; // tidak ada perubahan: jangan sentuh sheet

  sheet.getRange(rowIndex, min + 1, 1, max - min + 1).setValues([row.slice(min, max + 1)]);
  delete TABLE_CACHE_[name];
  return true;
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
