/**
 * IbadahKu — entrypoint Apps Script.
 * Frontend: HtmlService (AppShell.html + ui/*.html hasil `npm run build:gas`).
 * Backend: Router.gs (api) + service lain di repo ini.
 */

function doGet(e) {
  var page = e && e.parameter ? String(e.parameter.page || '') : '';

  if (page === 'health') {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, app: APP.name, version: APP.version, time: nowIso_() })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('AppShell')
    .evaluate()
    .setTitle('IbadahKu — Ibadah Harian Muslim')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Dipakai <?!= include('ui/Styles') ?> di Index.html. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Jalankan sekali dari editor: membuat spreadsheet database + sheet + data awal. */
function setup() {
  var ss = db_();
  ensureSheets_();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SPREADSHEET_ID')) props.setProperty('SPREADSHEET_ID', ss.getId());
  return 'Database siap: ' + ss.getUrl();
}

/** Jalankan sekali untuk pengingat harian (Google Calendar) + laporan mingguan. */
function setupTriggers() {
  return installTriggers_();
}

/** Hapus trigger yang dipasang aplikasi. */
function removeTriggers() {
  return removeTriggers_();
}
