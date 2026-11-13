# Knowledge — Aplikasi Ibadah Harian Muslim (GAS + Vue 3)

> Dokumen ini adalah **rencana kerja + basis pengetahuan** proyek.
> Status: draft v1 · Tanggal: 3 November 2026 · Target platform: Google Apps Script Web App (backend + frontend)
> Tech stack wajib: **Vue 3**, **Tailwind CSS**, **flatpickr (locale Indonesia)**, **SweetAlert2**, **Google Material Symbols**, **ApexCharts**.
> Semua endpoint API di bawah sudah **diuji langsung dengan curl pada 3 Nov 2026** (lihat §12).

---

## 1. Ringkasan Produk

**Nama kerja:** `IbadahKu` (bisa diganti)
**Satu kalimat:** Dasbor ibadah harian yang mencatat sholat, tilawah, dzikir, puasa, dan muhasabah — lalu menampilkannya kembali sebagai progres, streak, dan grafik supaya ibadah lebih konsisten.

**Masalah yang dipecahkan**
1. Jadwal sholat tersebar di banyak aplikasi; pencatatan ibadah harian biasanya hanya di buku atau tidak sama sekali.
2. Umat butuh **umpan balik** (streak, grafik, laporan bulanan) untuk menjaga konsistensi, bukan hanya pengingat.
3. Aplikasi populer penuh iklan dan berat; solusi GAS + Google Sheets bisa **gratis, ringan, dan datanya milik pengguna sendiri**.

**Prinsip desain produk**
- **Mobile-first, satu tangan.** Mayoritas akses lewat HP.
- **Catat ≤ 2 tap.** Checklist sholat langsung dari kartu jadwal.
- **Tanpa gamifikasi berlebihan.** Streak sebagai motivasi, bukan kompetisi publik (ibadah bukan lomba).
- **Privasi dulu.** Data ibadah itu sensitif: tidak ada leaderboard publik, tidak ada share default.

**Persona utama**
| Persona | Kebutuhan inti |
|---|---|
| Pekerja kantoran | Pengingat sholat + tracker cepat + laporan mingguan |
| Mahasiswa | Tilawah/hafalan target + dzikir + streak ringan |
| Ibu rumah tangga | Jadwal anak/keluarga, puasa sunnah, doa harian |
| Lansia / pemula | Tampilan besar, teks jelas, panduan singkat |

---

## 2. Keputusan Arsitektur (dan alasannya)

### 2.1 Dua opsi, satu rekomendasi

| | **Opsi A — Full GAS** (default) | **Opsi B — Frontend statis + GAS API** |
|---|---|---|
| Frontend | HTML Service (`Index.html` + include) | Cloudflare Pages / GitHub Pages |
| Backend | `doGet` + `google.script.run` | `doPost` JSON + token |
| Build tool | Wajib: Tailwind CLI → CSS di-`include` | Bebas (Vite) |
| Kelebihan | 1 deployment, tanpa CORS, auth Google otomatis | Build modern, bundle kecil, cache CDN, PWA benar-benar jalan |
| Kekurangan | Bundle JS/CSS di dalam HTML (sulit >1 MB), tanpa service worker, LCP lebih lambat | Perlu verifikasi token & CORS manual |
| Kapan | MVP, internal, cepat rilis | Jika target >500 pengguna aktif atau butuh offline |

**Rencana:** mulai **Opsi A**, siapkan kode API sebagai modul terpisah agar **migrasi ke Opsi B tidak menulis ulang** (semua aksi lewat router `api(action, payload)`; `google.script.run` hanya lapisan transport).

> Catatan repo: `index.html` saat ini hanyalah halaman wrapper yang meng-`iframe` URL `/exec`. Agar tetap berfungsi, web app harus di-deploy dengan **`XFrameOptionsMode.ALLOWALL`**. Kalau wrapper ini tidak dipakai lagi, cukup pakai URL `/exec` langsung.

### 2.2 Peta arsitektur

```
┌──────────────────────────── Browser (iframe / tab) ───────────────────────────┐
│  Vue 3 (global build, Composition API)                                        │
│   ├─ Router hash (#/dashboard, #/sholat, #/quran, #/dzikir, #/laporan)         │
│   ├─ Store reaktif (profile, settings, today, stats)                          │
│   ├─ Komponen: PrayerCard, CheckList, StreakRing, Heatmap, DateRangePicker     │
│   └─ Lib: Tailwind (CSS ter-build), flatpickr(id), SweetAlert2, ApexCharts,    │
│            Material Symbols (font)                                            │
└───────────────────────────────┬───────────────────────────────────────────────┘
                                │ google.script.run.api(action, payload)  (JSON string)
┌───────────────────────────────▼───────────────────────────────────────────────┐
│  Google Apps Script                                                          │
│   Router.gs      → whitelist action + validasi + try/catch envelope           │
│   Auth.gs        → identitas user (email), profil, role                       │
│   Repo.gs        → akses Sheet: baca batch, tulis + LockService, index cache   │
│   PrayerService  → myquran (Kemenag) → fallback Aladhan method 20 → cache      │
│   QuranService   → equran.id (surat, tafsir, audio) + cache                    │
│   StatsService   → agregasi harian/bulanan, streak, heatmap                    │
│   Notify.gs      → trigger harian: email/Telegram/Kalender                     │
│   Utils.gs       → tanggal WIB, format, hash, validasi                         │
└───────────────┬───────────────────────────────┬───────────────────────────────┘
                │                               │
        Google Sheets (database)        CacheService / ScriptProperties
```

### 2.3 Kenapa `google.script.run`, bukan `doPost`?
- Same-origin, **tanpa CORS**, tanpa token di URL, otomatis membawa identitas user (jika deploy "execute as: user accessing").
- Kekurangan: tidak bisa dipanggil dari luar iframe → untuk itu tetap sediakan `doPost(e)` dengan `action` + token HMAC (dipakai nanti untuk integrasi / frontend Opsi B).

---

## 3. Struktur File (GAS + `clasp`)

```
appsscript.json            # timezone Asia/Jakarta, webapp config, oauthScopes
Code.gs                    # doGet, include(), bootstrap config
Router.gs                  # api(action, payload) + registry aksi
Auth.gs                    # currentUser(), ensureProfile(), role check
Repo.gs                    # getSheet, readAll, appendRow, updateCell, lock
PrayerService.gs           # jadwal sholat + fallback + cache + hijriah
QuranService.gs            # proxy equran.id + cache
StatsService.gs            # streak, heatmap, laporan
Notify.gs                  # trigger harian (reminder & prewarm cache)
Utils.gs                   # tanggal, validasi, response envelope, hash
Index.html                 # shell: <head>, include styles & app
ui/Styles.html             # hasil build Tailwind (satu file <style>)
ui/App.html                # bootstrap Vue + router + store
ui/components/*.html       # komponen per fitur (di-include)
ui/lib.html                # tag CDN: vue, flatpickr, sweetalert2, apexcharts
tests/manual-checklist.md
```

**Aturan penting Apps Script**
- Semua aset frontend **harus** berupa file `.html` (CSS/JS dibungkus `<style>`/`<script>`), karena HtmlService tidak menyajikan file statis.
- Gunakan `<?!= include('ui/Styles') ?>` (force-print) dan hindari template literal `${}` di dalam HTML kecuali di-escape.
- Batasi ukuran total HTML; bila CSS+JS > ±1 MB, pecah per-modul dan muat ApexCharts **lazy** (hanya saat tab Laporan dibuka) — hemat ±500 KB.
- `appsscript.json`: `"timeZone": "Asia/Jakarta"`, `"webapp": { "executeAs": "USER_ACCESSING", "access": "ANYONE" }` → setiap pengguna punya identitas email sendiri dan akses Sheet diatur oleh script, bukan oleh izin Sheet.
- Development: `npm i -g @google/clasp` → `clasp login` (interaktif, jalankan di terminal sendiri) → `clasp clone <scriptId>` / `clasp push --watch` → `clasp deploy`. Simpan `.clasp.json` di `.gitignore` bila berisi `scriptId` pribadi.

---

## 4. Desain Frontend

### 4.1 Prinsip teknis
- **Vue 3 global build** (`vue.global.prod.js`) + **Composition API**, tanpa build step. Template ditulis di dalam file HTML komponen (`<script type="text/x-template" id="...">`) atau *render function*; **hindari runtime compiler untuk template besar** bila CSP sandbox memblokir `unsafe-eval` → alternatif: `<script type="module">` + `vue.esm-browser.prod.js` juga memakai compiler, jadi **strategi aman = pisahkan template ke `<script type="text/x-template">` dan pakai `app.component('x', { template: '#tpl-x' })`**; uji lebih dulu di deployment percobaan, dan sediakan fallback render function bila muncul error `unsafe-eval`.
- Router: `vue-router` global build dengan **hash mode** (`#/sholat`) — aman di dalam iframe GAS.
- State: satu `reactive()` store + `computed`, tanpa Pinia (tidak perlu untuk skala ini).
- Transport: wrapper `api(action, payload)` → Promise, dengan timeout, retry 1×, loading counter global, dan error→SweetAlert2.

```js
// ui/Api.js (dalam App.html)
const api = (() => {
  let pending = 0;
  const call = (action, payload = {}) => new Promise((resolve, reject) => {
    pending++; store.loading = true;
    google.script.run
      .withSuccessHandler(res => {
        pending--; store.loading = pending > 0;
        const out = JSON.parse(res);
        out.ok ? resolve(out.data) : reject(out.error);
      })
      .withFailureHandler(err => { pending--; store.loading = pending > 0; reject(err); })
      .api(action, JSON.stringify(payload));
  });
  return { call };
})();
```

### 4.2 Design system ringkas
| Token | Nilai | Catatan |
|---|---|---|
| `--brand` | `#0E7C66` (emerald) | aksi utama, nav aktif |
| `--brand-deep` | `#0B3B33` | header, dark surface |
| `--gold` | `#C9A227` | aksen, badge streak |
| `--bg` | `#FAF9F6` (warm paper) | latar terang, tidak menyilaukan |
| `--ink` | `#14201C` | teks utama |
| Font UI | **Plus Jakarta Sans** | netral, Indonesia-made, enak di kecil |
| Font Arab | **Amiri** / **Scheherazade New** | ayat & doa, ukuran 1.6–2rem, `dir="rtl"` |
| Ikon | **Material Symbols Rounded** | `font-variation-settings` untuk fill saat aktif |
| Radius | 16px kartu, 999px chip | sudut lembut, tidak kekanak-kanakan |
| Spacing | skala 4px (Tailwind default) | target sentuh ≥ 44px |

- **Dark mode:** `class` strategy (`darkMode: 'class'`), toggle disimpan di profil, ikut `prefers-color-scheme` saat pertama.
- **Aksesibilitas:** kontras ≥ 4.5:1, fokus ring 2px, `aria-live` untuk countdown, mode "teks besar" (root `font-size: 18px`).
- **Countdown** dihitung di klien dari jam perangkat, disinkronkan sekali dengan `serverNow` dari backend (hindari jam HP salah).

### 4.3 Layout (mobile-first)
```
┌──────────────────────────────────┐
│ Assalamualaikum, Fulan  [🌙][👤] │  header sticky, hijau gradient
│ Jakarta · 23 Jumadil Awal 1448 H │  hijriah + tombol ganti kota
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Maghrib 17:50                │ │  PrayerCard: berikutnya + countdown
│ │ -02:14:33  [Ubah lokasi]     │ │  progress bar menuju waktu sholat
│ └──────────────────────────────┘ │
│ Jadwal hari ini (chip horizontal)│
│ Subuh ✓  Dzuhur ✓  Ashar ○ ...   │  tap = tandai sholat (1 tap)
├──────────────────────────────────┤
│ Streak 12 hari 🔥   Tilawah 4/5  │  kartu kecil 2 kolom
│ Progress sholat 3/5              │
├──────────────────────────────────┤
│ [Ringkasan minggu: heatmap 7×5]  │  ApexCharts (lazy)
└──────────────────────────────────┘
│ Dash │ Sholat │ Quran │ Dzikir │ More │  bottom nav 5 item
```

### 4.4 flatpickr — format Indonesia (sudah diverifikasi tersedia)
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4/dist/flatpickr.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4/dist/l10n/id.js"></script>
```
```js
const fp = flatpickr(el, {
  locale: 'id',              // l10n/id.js → bulan & hari Bahasa Indonesia, minggu mulai Senin
  dateFormat: 'Y-m-d',       // SIMPAN selalu ISO (aman untuk Sheets & sorting)
  altInput: true,
  altFormat: 'j F Y',        // TAMPILKAN: "3 November 2026"
  maxDate: 'today',
  disableMobile: true,       // konsisten di iOS (picker native tidak ikut locale)
  onChange: ([d]) => store.setDate(toISODate(d))
});
```
- Tema flatpickr disesuaikan via CSS variable (`--fp-accent`) agar senada Tailwind; **jangan** pakai tema default biru.
- Rentang laporan: `mode: 'range'` + shortcut chip "7 hari / 30 hari / Bulan ini / Ramadhan".
- Semua tanggal disimpan `YYYY-MM-DD` (string), **jangan** kirim objek `Date` lewat JSON (berubah zona waktu).

### 4.5 SweetAlert2 — konfirmasi & feedback
```js
Swal.fire({
  icon: 'question', title: 'Tandai qadha?',
  text: 'Sholat Subuh 12 Okt 2026 akan dicatat sebagai qadha.',
  showCancelButton: true, confirmButtonText: 'Ya, catat', cancelButtonText: 'Batal',
  confirmButtonColor: '#0E7C66', cancelButtonColor: '#94a3b8',
  customClass: { popup: 'rounded-2xl font-sans', title: 'text-ink' }
});
```
Aturan pemakaian: **sukses = toast** (kecil, kanan atas), **error = modal** (dengan pesan yang bisa ditindaklanjuti), **destruktif = konfirmasi** (hapus catatan, reset target). Semua teks Bahasa Indonesia; `confirmButtonText` wajib eksplisit (default "OK" terasa asing).

### 4.6 Material Symbols
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&display=swap" rel="stylesheet">
<span class="material-symbols-rounded" aria-hidden="true">mosque</span>
```
- Ikon yang dipakai (subset, konsisten): `mosque`, `menu_book`, `self_improvement`, `calendar_month`, `insights`, `notifications`, `location_on`, `dark_mode`, `check_circle`, `pending`, `local_fire_department`.
- **Cegah flash teks ligatur**: set `.material-symbols-rounded { font-size: 24px; line-height: 1; opacity: 0; }` lalu `document.fonts.ready.then(() => el.classList.add('fonts-loaded'))` → `opacity: 1`.

### 4.7 ApexCharts — rencana visualisasi
Muat hanya di tab Laporan (`import` dinamis saat route aktif).

| Grafik | Tipe | Data | Pesan yang disampaikan |
|---|---|---|---|
| Konsistensi 30 hari | `heatmap` (7 kolom × 5 baris) | skor harian 0–5 | pola hari lemah (mis. Jumat/akhir pekan) |
| Sholat per waktu | `radialBar` ×5 atau `bar` bertumpuk | jumlah berjamaah/tepat/qadha | waktu mana yang paling sering terlewat |
| Streak | `radialBar` | hari berturut | pencapaian, bukan perbandingan sosial |
| Tilawah | `area` / `line` | halaman/ayat per hari | tren, target garis putus-putus (`annotations.yaxis`) |
| Komposisi ibadah | `donut` | sholat, tilawah, dzikir, puasa | keseimbangan amalan |
| Ramadhan | `bar` stacked | tarawih, tadarus, sedekah | laporan khusus bulan Ramadhan |

```js
const base = {
  chart: { fontFamily: 'Plus Jakarta Sans, sans-serif', toolbar: { show: false }, animations: { speed: 350 } },
  colors: ['#0E7C66', '#C9A227', '#2A9D8F', '#94a3b8'],
  grid: { borderColor: '#E6E4DD', strokeDashArray: 4 },
  tooltip: { theme: 'light' },
  noData: { text: 'Belum ada data', style: { fontSize: '14px' } }
};
```
Simpan instance di `Map` dan `destroy()` saat unmount (hindari memory leak di SPA), serta `chart.resize()` saat orientasi berubah.

### 4.8 Tailwind — strategi build (penting)
- **Jangan** pakai Play CDN di produksi: ukuran besar, kompilasi di browser, dan muncul peringatan konsol.
- Build lokal: `npx @tailwindcss/cli -i src/input.css -o dist/styles.css --minify` (v4) atau `npx tailwindcss@3 -c tailwind.config.js -i src/input.css -o dist/styles.css --minify`.
- Konversi hasil build → `ui/Styles.html`:
  ```bash
  mkdir -p ui && printf '<style>\n' > ui/Styles.html && cat dist/styles.css >> ui/Styles.html && printf '\n</style>\n' >> ui/Styles.html
  ```
- `content`/`@source` wajib memindai `ui/**/*.html` **dan** string kelas di `.gs` (kelas dinamis), plus `safelist` untuk kelas yang dirakit runtime (`bg-${color}-500` → ganti dengan map objek, jangan string template).
- Tailwind v4: konfigurasi tema lewat `@theme` di CSS (tidak perlu `tailwind.config.js`).
- **Gate:** `npm run build:css` masuk ke `predeploy` supaya CSS tidak pernah ketinggalan.

---

## 5. Backend & Data

### 5.1 Google Sheets sebagai database — keputusan
Satu spreadsheet per instalasi, sheet **flat** (satu baris = satu kejadian), hindari sel gabungan.

| Sheet | Kolom | Kunci/Indeks |
|---|---|---|
| `Users` | `user_id` (email hash), `email`, `nama`, `role`, `created_at`, `last_seen`, `tz`, `status` | A |
| `Profiles` | `user_id`, `city_id`, `city_name`, `lat`, `lng`, `method`, `hijri_adj`, `target_tilawah`, `target_dzikir`, `theme`, `notif_channel`, `notif_time`, `updated_at` | A |
| `PrayerLog` | `log_id`, `user_id`, `date`, `prayer` (subuh/dzuhur/ashar/maghrib/isya), `status` (jamaah/tepat/qadha/-, kosong), `note`, `updated_at` | `user_id|date` di kolom bantu/Map |
| `SunnahLog` | `log_id`, `user_id`, `date`, `type` (rawatib, dhuha, tahajud, witir, tarawih), `count`, `updated_at` | `user_id|date` |
| `QuranLog` | `log_id`, `user_id`, `date`, `surah`, `ayah_from`, `ayah_to`, `pages`, `mode` (tilawah/hafalan/murojaah), `note`, `updated_at` | `user_id|date` |
| `DhikrLog` | `log_id`, `user_id`, `date`, `dzikir_id`, `target`, `count`, `updated_at` | `user_id|date` |
| `FastingLog` | `log_id`, `user_id`, `date`, `type` (ramadhan/senin-kamis/ayyamul bidh/qadha), `status`, `updated_at` | `user_id|date` |
| `Journal` | `log_id`, `user_id`, `date`, `syukur`, `muhasabah`, `doa`, `mood`, `updated_at` | `user_id|date` |
| `Bookmarks` | `id`, `user_id`, `kind` (ayat/doa/dzikir), `ref`, `label`, `created_at` | A |
| `PrayerCache` | `cache_key` (`city_id|YYYY-MM`), `payload_json`, `fetched_at` | A |
| `AuditLog` | `ts`, `user_id`, `action`, `ms`, `ok`, `err` | — |
| `Config` | `key`, `value` | A |

**Aturan penulisan**
- `getDataRange().getValues()` sekali per request, simpan di `CacheService.getScriptCache()` (maks 6 jam, **100 KB per key**, 1000 key) — cache hanya untuk data publik/berat (jadwal sholat, daftar kota, surat), **bukan** untuk data pribadi yang sering berubah.
- Semua tulis lewat `LockService.getScriptLock().waitLock(20000)` lalu `try/finally releaseLock()`.
- Update baris = cari indeks via `TextFinder`/Map, lalu `setValues` pada **satu baris** (jangan loop `getRange` per sel).
- Normalisasi `prayer` ke lowercase ASCII; validasi `status` terhadap enum; tolak tanggal di masa depan (> hari ini + 1) dan > 365 hari ke belakang.
- Backup otomatis: trigger mingguan `makeCopy()` ke folder Drive `IbadahKu/backup`, retensi 8 file terakhir.
- Skala: Sheets nyaman sampai ±5 juta sel; jika `PrayerLog` > 200 ribu baris, arsipkan per tahun ke spreadsheet terpisah (sudah disiapkan `Repo.archiveYear()`).
- **Timezone**: semua "hari" dihitung dengan `Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd')` di backend; klien tidak boleh menentukan "hari ini" sendiri (hanya untuk tampilan).

### 5.2 Kontrak API (envelope seragam)
```json
{ "ok": true,  "data": { }, "meta": { "serverNow": "2026-11-03T10:12:00+07:00", "ms": 84 } }
{ "ok": false, "error": { "code": "VALIDATION", "message": "Tanggal tidak valid" }, "meta": { } }
```
| Action | Payload | Hasil |
|---|---|---|
| `bootstrap` | `{}` | profil, settings, jadwal hari ini, ringkasan streak, `serverNow` (**1 request untuk halaman awal**) |
| `profile.save` | `{nama, cityId, lat, lng, target...}` | profil tersimpan |
| `city.search` | `{q}` | daftar kota (dari cache `PrayerCache`/data statis) |
| `prayer.today` | `{date?}` | 5 waktu + imsak/dhuha + hijriah |
| `prayer.month` | `{year, month}` | array harian (untuk kalender & chart) |
| `prayer.mark` | `{date, prayer, status}` | baris terbaru |
| `sunnah.mark` | `{date, type, count}` | — |
| `quran.log` | `{date, surah, ayahFrom, ayahTo, pages, mode}` | progres + sisa target |
| `quran.surah` | `{nomor}` | surat + terjemahan + audio (cache) |
| `dhikr.log` | `{date, dzikirId, count}` | progres dzikir |
| `fasting.mark` | `{date, type, status}` | — |
| `journal.save` | `{date, syukur, muhasabah, doa, mood}` | — |
| `stats.summary` | `{from, to}` | total, persentase, streak, heatmap 30 hari |
| `stats.report` | `{from, to}` | data siap ApexCharts |
| `export.month` | `{year, month}` | URL CSV/Sheets (file pribadi di Drive) |
| `admin.stats` | `{}` | hanya role `admin` |

Router memakai **whitelist** (map action → fungsi), bukan `eval`/nama dinamis; setiap handler dibungkus `try/catch` + `AuditLog` + batas waktu (`Utilities.sleep` tidak dipakai; hindari request > 5 s).

### 5.3 Sumber data eksternal (terverifikasi)

**Jadwal sholat — prioritas berlapis**
1. **myQuran API v2** (sumber data Kemenag/Bimas Islam, per kabupaten/kota Indonesia) — `GET https://api.myquran.com/v2/sholat/jadwal/{kotaId}/{YYYY}/{MM}/{DD}`
   Contoh nyata: `1301` (KOTA JAKARTA) → `subuh 04:08, dzuhur 11:40, ashar 14:56, maghrib 17:50, isya 19:01`, plus `imsak`, `terbit`, `dhuha`.
   Daftar kota: `GET /v2/sholat/kota/semua` → `{id, lokasi}` (contoh: `{"id":"1301","lokasi":"KOTA JAKARTA"}`).
2. **Aladhan API** (fallback global / luar negeri) — `GET https://api.aladhan.com/v1/timingsByCity/{DD-MM-YYYY}?city=Jakarta&country=Indonesia&method=20`
   `method=20` = **KEMENAG** (dikonfirmasi dari `/v1/methods`: `"KEMENAG": {"id": 20, "name": "Kementerian Agama Republik Indonesia"}`). Juga tersedia `calendarByCity/{tahun}/{bulan}`, `qibla/{lat}/{lng}`, `gToH/{DD-MM-YYYY}`, `islamicHolidaysByHijriYear/{tahun}`.
3. **Cache bulanan** di `PrayerCache` → **1 panggilan per kota per bulan**, bukan per pengguna per hari. Ini penghemat kuota terbesar.

> Selisih hisab: jadwal Kemenag bisa berbeda ±1–2 menit dari perhitungan astronomis; sediakan `hijri_adj` dan `offset_menit` di profil agar pengguna bisa menyesuaikan dengan masjid setempat (transparan, bukan "diam-diam").

**Al-Qur'an — equran.id API v2**
`GET https://equran.id/api/v2/surat` (daftar 114 surat: `nomor`, `nama`, `namaLatin`, `jumlahAyat`, `tempatTurun`, `arti`, `deskripsi`)
`GET https://equran.id/api/v2/surat/{nomor}` → ayat Arab, latin, terjemahan Indonesia, audio per ayat, tafsir.
Panggil **dari backend** (cache 6 jam, satu surat per key, pecah per-ayat bila > 100 KB) supaya tidak bergantung pada CORS dan mengurangi beban API publik. Sertakan atribusi "Sumber: EQuran.id".

**Alternatif:** `islamic.network` (AlAdhan, Quran, kalender, qibla — tanpa API key), `ummahapi.com` (23 metode hisab). Catat sebagai cadangan bila myQuran/equran down.

### 5.4 Pengingat & notifikasi — batasan nyata
Web app GAS **tidak bisa** mengirim push notification (tidak ada service worker di sandbox iframe). Pilihan realistis:

| Kanal | Biaya | Catatan implementasi |
|---|---|---|
| **Google Calendar** (rekomendasi utama) | gratis | `CalendarApp` buat event per sholat untuk 7 hari ke depan, reminder 10 menit → notifikasi native di HP, tanpa izin tambahan |
| **Email** | gratis (kuota ~100/hari consumer) | `MailApp.sendEmail` ringkasan harian/mingguan, bukan per sholat |
| **Telegram Bot** | gratis | `UrlFetchApp` ke Bot API; user memasang token chat sendiri di `Profiles` (token disimpan di Script Properties, bukan di Sheet) |
| WhatsApp Cloud API | berbayar/verifikasi bisnis | jangan untuk MVP |

Trigger: `ScriptApp.newTrigger('dailyReminder').timeBased().atHour(4).create()` (04:00 WIB menyiapkan event kalender), plus `weeklyReport` Senin 06:00. **Kuota trigger**: 90 menit/hari (akun consumer) / 6 jam (Workspace); total runtime trigger dihitung, jadi jaga tiap job < 60 detik dengan `paginate()`.

### 5.5 Kuota & batas yang harus dihormati
| Batas | Nilai | Dampak desain |
|---|---|---|
| Eksekusi per panggilan | 6 menit (consumer) | hindari loop besar; batching & cache |
| Trigger total runtime | 90 menit/hari (consumer) | reminder harus ringan, 1 job harian |
| `UrlFetchApp` | 20.000/hari (consumer) | cache bulanan wajib |
| `CacheService` | 100 KB/key, 6 jam | pecah payload; jangan simpan seluruh Al-Qur'an |
| Ukuran spreadsheet | ±10 juta sel | arsip per tahun |
| Output HtmlService | praktis < 1 MB per halaman | lazy-load ApexCharts, split file |
| Concurrent users | eksekusi script antre | UI harus tahan request 3–8 detik (skeleton + retry) |

---

## 6. Saran Fitur (hasil riset produk sejenis)

Riset pola fitur dari aplikasi sejenis (AyoMuslim "Yaumiyah", Muslim Pro, iQIBLA Life, Muslim App, aplikasi EQuran) menunjukkan inti yang selalu diminta: **jadwal sholat akurat, pelacak ibadah harian, Al-Qur'an, dzikir/doa, arah kiblat, kalender hijriah + Ramadhan**. Berikut penyusunan ulang untuk konteks web GAS, dengan prioritas.

### 6.1 MVP (wajib ada — Fase 1)
1. **Dasbor hari ini** — sholat berikutnya + countdown, hijriah, progress sholat 5 waktu, streak.
2. **Jadwal sholat** — deteksi/pilih kota (cari dari 500+ kota myQuran), imsak, terbit, dhuha; tampilan bulanan + kalender.
3. **Checklist sholat** — 1 tap per waktu dengan status **Jamaah / Tepat waktu / Qadha** (bukan sekadar centang: status inilah yang membuat laporan bermakna) + catatan singkat.
4. **Tracker tilawah** — target harian (halaman/ayat), input cepat, sisa target, total khatam.
5. **Dzikir pagi–sore + tasbih digital** — counter besar, target, getar (Vibration API bila didukung), simpan progres harian.
6. **Ringkasan & streak** — persentase kepatuhan 7/30 hari, heatmap, kartu berbagi (gambar/teks, opsional).
7. **Pengaturan** — kota, koreksi ±menit, target, tema, kanal notifikasi.

### 6.2 Fase 2 — pendalaman ibadah
8. **Sholat sunnah** — rawatib, dhuha, tahajud, witir (checklist terpisah, tidak mencampur statistik wajib).
9. **Qadha counter** — hutang sholat/puasa dengan pengurangan otomatis saat dicatat.
10. **Al-Qur'an lengkap** — 114 surat, terjemahan Indonesia, audio per ayat, bookmark, "lanjutkan bacaan" (last read), mode Mushaf vs per-ayat.
11. **Hafalan & murojaah** — daftar hafalan per juz/surat, jadwal ulang sederhana (spaced: 1-3-7-14-30 hari), skor kelancaran.
12. **Doa & Asmaul Husna** — doa harian per situasi (bangun tidur, safar, hujan), 99 nama dengan arti; favorit.
13. **Kalender hijriah** — konversi tanggal, hari besar Islam, peringatan puasa sunnah (Senin–Kamis, Ayyamul Bidh 13–15), dengan koreksi manual ±1 hari (perbedaan hisab/rukyat).
14. **Jurnal muhasabah** — syukur, introspeksi, doa yang diminta hari itu; grafik mood ringan.

### 6.3 Fase 3 — Ramadhan & sosial ringan
15. **Mode Ramadhan** — imsakiyah, hitung mundur imsak/berbuka, tracker tarawih, tadarus (target khatam 30 juz), i'tikaf, zakat fitrah, sedekah harian (tanpa pembayaran; hanya catatan).
16. **Laporan bulanan** — PDF/WhatsApp-share-ready (teks), ekspor CSV/Sheets.
17. **Keluarga / grup kecil** — 1 akun "pendamping" (pasangan/anak) dengan izin baca, bukan leaderboard publik.
18. **Sinkron Google Calendar** — jadwal sholat 7 hari ke depan, otomatis diperbarui trigger.

### 6.4 Ide diferensiasi (pilih 1–2, jangan semua)
19. **"Kenapa aku bolong?"** — insight otomatis: "Ashar paling sering terlewat, biasanya hari kerja 15.00–16.00" + saran ibadah singkat (qadha/tobat), bukan menghakimi.
20. **Mode perjalanan (musafir)** — jadwal menyesuaikan lokasi, opsi jamak/qashar sebagai **panduan pendidikan** dengan disclaimer (bukan fatwa).
21. **Unduh "kartu amal" mingguan** — gambar rapi untuk keluarga (opsional, default mati).
22. **Panduan pemula** — bacaan sholat, wudhu, tayamum; cocok untuk mualaf/lansia.
23. **Ramadhan/Haji countdown** — target emosional, ringan dibuat.
24. **Tema & aksesibilitas** — mode lansia (font 18px, tombol besar), high contrast.

### 6.5 Yang **tidak** dikerjakan (kesadaran scope)
- Arah kiblat dengan kompas sensor: `DeviceOrientation` butuh permission + HTTPS top-level dan sering **diblokir di iframe** → cukup tampilkan **bearing derajat + tautan Google Maps**, beri catatan kompromi.
- Push notification native, widget home screen, adzan otomatis latar belakang → mustahil di GAS.
- Live streaming kajian, marketplace, pembayaran zakat → di luar batas platform & risiko tinggi.

**Peta prioritas (MoSCoW)**
| Prioritas | Fitur |
|---|---|
| Must | 1–7 |
| Should | 8, 9, 10, 11, 13, 16 |
| Could | 12, 14, 15, 17, 18, 19, 24 |
| Won't (sekarang) | kiblat sensor, push native, pembayaran |

---

## 7. Rencana Kerja per Fase

| Fase | Isi | Luaran terukur | Estimasi |
|---|---|---|---|
| **0. Fondasi** | setup `clasp`, `appsscript.json`, router, envelope, `include()`, Tailwind build pipeline, sheet + seed data, auth identitas | `bootstrap` mengembalikan profil + `serverNow`; deploy `/dev` jalan | 1–2 hari |
| **1. Core** | jadwal sholat (myQuran→cache→Aladhan), checklist sholat, dasbor, countdown, pengaturan kota | 5 user uji bisa mencatat 5 sholat & lihat streak | 4–5 hari |
| **2. Qur'an & dzikir** | proxy equran + cache, reader + audio, tilawah log, dzikir/tasbih | baca 1 surat & catat progres < 2 tap | 4–5 hari |
| **3. Laporan** | `stats.summary`, heatmap, radialBar, donut, rentang flatpickr, ekspor | 6 grafik terisi data nyata, waktu muat < 2,5 s | 3–4 hari |
| **4. Pengingat** | trigger harian, Google Calendar, email mingguan, template pesan | event muncul di HP tanpa membuka app | 2 hari |
| **5. Pendalaman** | sholat sunnah, qadha, hafalan, kalender hijriah, jurnal | masing-masing punya tes manual | 5–7 hari |
| **6. Ramadhan & polish** | mode Ramadhan, laporan bulanan, aksesibilitas, dark mode, onboarding, hardening | uji 20 skenario lolos, dokumentasi pengguna | 4–5 hari |

Total realistis **±4–6 minggu** untuk satu pengembang sambil mengerjakan hal lain.

---

## 8. Keamanan, Privasi, dan Etika Data

- **Identitas:** `Session.getActiveUser().getEmail()` dengan `executeAs: USER_ACCESSING`. Jika email kosong (akun berbeda domain), fallback ke **kode akses** yang disimpan di Script Properties (`loginWithToken`) — jangan pernah percaya `user_id` yang dikirim klien.
- **Isolasi data:** setiap query difilter `user_id = currentUser.id` di server; tidak ada endpoint yang menerima `user_id` dari klien (kecuali admin dengan role check ganda).
- **Data sensitif:** `PrayerLog`, `Jurnal`, `Qadha` tidak pernah dikirim ke pihak ketiga; jangan log isi jurnal ke `AuditLog` atau `console.log`.
- **Validasi:** whitelist enum, `Number`/`String` coercion, batas panjang teks (jurnal ≤ 2000 karakter), tanggal ISO valid, `JSON.parse` dibungkus try/catch.
- **Rate limit:** hitung per user per menit di `CacheService` (maks 30 request/menit), blokir write > 500/hari.
- **XSS:** Vue meng-escape secara default; **jangan** pakai `v-html` untuk ayat/tafsir dari API (equran mengembalikan HTML di `deskripsi`) — sanitasi dengan whitelist tag atau tampilkan sebagai teks.
- **Rahasia:** token Telegram/API key hanya di Script Properties; tidak pernah di `Profiles` atau kode frontend.
- **Etika:** tidak menampilkan "dosa/berdosa", tidak memberi vonis hukum; sediakan disclaimer bahwa jadwal bersifat perkiraan dan perbedaan hisab adalah hal wajar.

---

## 9. Kualitas: Testing & Definition of Done

**Strategi verifikasi (tanpa framework berat):**
1. `tests/manual-checklist.md` — setiap aksi API diuji via `curl` (deployment `/exec`) + via UI.
2. `Utils.test()` di GAS: tanggal WIB, parsing ISO, streak lintas bulan/tahun, batas `hijri_adj`, perhitungan persentase (0 pembagi), validasi enum.
3. Uji kuota: jalankan `bootstrap` 100× berurutan, catat waktu (`AuditLog`) — pastikan < 2 s rata-rata dan tidak menyentuh `UrlFetch` (cache hit).
4. Uji isolasi: dua akun berbeda → pastikan data tidak bocor (bandingkan respons `stats.summary`).
5. Uji offline/timeout: matikan jaringan → tampilkan cache `localStorage` + banner "data mungkin belum terbaru".

**Definition of Done per fitur**
- [ ] Aksi API ada di whitelist + validasi + envelope konsisten
- [ ] Ada state kosong, loading (skeleton), dan error (SweetAlert2) yang manusiawi
- [ ] Responsif 360 px & 768 px; target sentuh ≥ 44 px; kontras AA
- [ ] Teks Bahasa Indonesia; tanggal `d F Y`; angka pakai `Intl.NumberFormat('id-ID')`
- [ ] Tidak menambah request > 1 per interaksi (kecuali disengaja & terdokumentasi)
- [ ] Ditambahkan ke `knowledge.md` bagian fitur + tes manual

---

## 10. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| CSP iframe memblokir compiler template Vue | app blank | uji lebih awal; template di `<script type="text/x-template">`; sediakan fallback render function |
| Kuota `UrlFetch`/trigger habis | jadwal tidak update | cache bulanan, 1 job harian, `UrlFetchApp` hanya saat cache miss |
| Latensi GAS 3–8 s | pengguna kabur | `bootstrap` tunggal, skeleton, cache klien `localStorage` (TTL 15 menit untuk data publik) |
| myQuran/equran down | fitur mati | fallback Aladhan + `islamic.network`; status banner + data cache |
| Sheet tumbuh & melambat | semua lambat | arsip tahunan, batasi kolom, hindari `setValue` per sel |
| Perbedaan jadwal dengan masjid | ketidakpercayaan | tampilkan sumber + koreksi ±menit + disclaimer |
| Data ibadah bocor | krisis kepercayaan | isolasi per user, tanpa leaderboard publik, backup privat di Drive |
| Scope creep (kiblat sensor, push, payment) | telat rilis | daftar "Won't" di §6.5 disepakati sejak awal |

---

## 11. Pertanyaan yang Perlu Dikunci Sebelum Fase 1

1. **Pengguna:** hanya Anda sendiri + keluarga, atau publik? (menentukan strategi auth & kuota)
2. **Hosting:** tetap wrapper `index.html` (iframe) atau akses langsung URL `/exec`? (menentukan `XFrameOptionsMode`)
3. **Notifikasi:** cukup Google Calendar, atau perlu Telegram/email?
4. **Qur'an:** cukup terjemahan Indonesia (equran.id), atau perlu tafsir lengkap per ayat?
5. **Multi-bahasa:** Indonesia saja, atau perlu Inggris/Arab UI?

*(Asumsi sementara: publik terbatas, akses langsung `/exec`, Google Calendar + email, terjemahan + tafsir ringkas, UI Indonesia saja.)*

---

## 12. Referensi (diverifikasi 3 Nov 2026)

**Terverifikasi dengan `curl` langsung**
- `https://api.myquran.com/v2/sholat/kota/semua` → daftar kota `{id, lokasi}`; `https://api.myquran.com/v2/sholat/jadwal/1301/2026/11/03` → `subuh 04:08 … isya 19:01`
- `https://api.aladhan.com/v1/methods` → **method 20 = KEMENAG**; `https://api.aladhan.com/v1/timingsByCity/03-11-2026?city=Jakarta&country=Indonesia&method=20` → 200 OK + hijriah 23-05-1448
- `https://equran.id/api/v2/surat/1` → 200 OK (Arab, latin, terjemahan, audio, tafsir)
- `https://cdn.jsdelivr.net/npm/flatpickr@4/dist/l10n/id.js` → HTTP 200 (locale `id` tersedia)

**Dokumentasi**
- Aladhan Prayer Times API — https://aladhan.com/prayer-times-api
- AlAdhan API documentation (ringkasan endpoint) — https://gist.github.com/Zxce3/e1cc0363de3694e04bb440a5c8d57726
- Islamic Network APIs — https://islamic.network/api/
- myQuran API v2 (Postman docs) — https://documenter.getpostman.com/view/841292/2s9YsGittd
- EQuran.id API v2 — https://equran.id/apidev/v2
- Kemenag Bimas Islam — Jadwal Sholat — https://bimasislam.kemenag.go.id/jadwal-sholat
- Apps Script — HTML Service Best Practices — https://developers.google.com/apps-script/guides/html/best-practices
- Apps Script — Quotas for Google Services — https://developers.google.com/apps-script/guides/services/quotas
- Tailwind CSS — Play CDN (dev only) — https://tailwindcss.com/docs/installation/play-cdn
- flatpickr — https://flatpickr.js.org/
- SweetAlert2 — https://sweetalert2.github.io/
- Material Symbols — https://fonts.google.com/icons
- ApexCharts — https://apexcharts.com/docs/
- clasp — https://github.com/google/clasp

**Riset pola fitur aplikasi sejenis:** AyoMuslim (Yaumiyah), Muslim Pro, Muslim App (Azan/Qibla/Quran), iQIBLA Life, EQuran Mobile — pola yang konsisten muncul: jadwal sholat berbasis lokasi, pelacak ibadah harian, Al-Qur'an + audio, dzikir/doa, kalender hijriah, dan mode Ramadhan.

---

## 13. Log Perubahan
| Versi | Tanggal | Perubahan |
|---|---|---|
| v1 | 2026-11-03 | Draft awal: arsitektur, model data, kontrak API, saran fitur, roadmap, risiko |
| v1.1 | 2026-11-03 | Status implementasi Fase 0–1 ditambahkan (§14), catatan penyimpangan & nama `AppShell.html` |
| v1.2 | 2026-11-03 | Fase 2 selesai: sholat sunnah, qadha, hafalan/murojaah, kalender hijriah (§14.6) |
| v1.3 | 2026-11-03 | Mode Ramadhan: imsakiyah, tarawih, tadarus, i'tikaf/zakat/sedekah (§14.7) |
| v1.4 | 2026-11-03 | Laporan bulanan siap dibagikan: kartu PNG, teks WhatsApp, cetak/PDF (§14.8) |
| v1.5 | 2026-11-03 | Personalisasi kartu laporan: 5 palet, tema gelap/terang, toggle nama (§14.9) |
| v1.6 | 2026-11-03 | Grup keluarga: undangan email, persetujuan anggota, ringkasan baca-saja (§14.10) |
| v1.7 | 2026-11-03 | Target bersama: misi hafalan anak, tanda selesai dua arah (§14.11) |

---

## 14. Status Implementasi (3 Nov 2026)

### 14.1 Yang sudah jadi

| Bagian | File | Status |
|---|---|---|
| Backend GAS (router + service) | `Router.gs`, `Repo.gs`, `Auth.gs`, `PrayerService.gs`, `QuranService.gs`, `StatsService.gs`, `JournalService.gs`, `Notify.gs`, `Utils.gs`, `Code.gs` | ✅ ditulis, sintaks lolos `node --check` |
| Model data Sheets | `Repo.gs` (`SCHEMA`) | ✅ 12 sheet + `ensureSheets_()` |
| Frontend Vue 3 | `src/js/core.js`, `templates.js`, `components.js`, `views.js`, `main.js` | ✅ 6 view, 10 template valid (compiler resmi Vue) |
| Build & preview | `tools/build-gas.mjs`, `serve.mjs`, `check-templates.mjs`, `smoke.mjs` | ✅ semua skrip jalan |
| Mock backend untuk preview | `src/js/mock.js` | ✅ kontrak respons identik dengan GAS |

Fitur yang sudah berfungsi di preview: dasbor + countdown detik, checklist sholat 5 waktu dengan status Jamaah/Tepat/Qadha, jadwal harian + kalender bulanan, ganti kota, catat tilawah, tasbih dzikir, muhasabah, laporan (kolom/radial/donut/area) + ekspor CSV, pengaturan profil & tema, dark mode, hijriah lokal.

**Fase 2 (lihat §14.6):** sholat sunnah (rawatib/dhuha/tahajud/witir), qadha counter 5 sholat + puasa, hafalan dengan jadwal murojaah berjarak, dan kalender hijriah dengan hari besar + anjuran puasa sunnah.

**Fase 3 sebagian (lihat §14.7–14.10):** Mode Ramadhan (imsakiyah + hitung mundur, tarawih, tadarus, i'tikaf/zakat/sedekah, rekap bulan), laporan bulanan siap dibagikan (kartu PNG 1080×1350, teks WhatsApp, cetak/PDF), personalisasi kartu laporan (5 palet, tema gelap/terang, toggle nama), dan grup keluarga dengan izin baca-saja.

### 14.2 Penyimpangan dari rencana (disengaja)

1. **Chart laporan**: heatmap 30 hari di rencana diganti **bar chart skor harian** (heatmap Apex dengan 90 label tidak terbaca). Heatmap mini 14 hari tetap ada di dasbor sebagai grid CSS.
2. **Shell GAS bernama `AppShell.html`**, bukan `Index.html`, agar tidak bentrok dengan `index.html` wrapper situs pada filesystem case-insensitive.
3. **Jadwal sholat diambil bulanan** (`/v2/sholat/jadwal/{kota}/{tahun}/{bulan}`) — satu request per kota per bulan, bukan per hari. Terverifikasi bekerja.
4. **Hijriah dihitung lokal** (algoritma Kuwaiti, ±1 hari) alih-alih memanggil Aladhan tiap tanggal — hemat kuota `UrlFetch`; koreksi manual tersedia.
5. **myQuran & EQuran mengirim `Access-Control-Allow-Origin: *`** (diuji), sehingga frontend boleh memanggil langsung; backend tetap memproksi + cache agar kuota dan kuotasi data terkendali.

### 14.3 Cara menjalankan

```bash
npm ci                 # install devDependencies (tailwind, esbuild, vue, happy-dom)
npm run build          # dist/ untuk preview
npm run check          # validasi 10 template Vue
npm run smoke          # mount + buka semua route di happy-dom, cek error runtime
npm run dev            # build + server statis di 0.0.0.0:3000
```

### 14.3.1 Deploy ke Apps Script dengan `clasp`

`@google/clasp` sudah menjadi **devDependency** (`npm ci` ikut memasangnya), jadi cukup `npx clasp` / `npm run gas:*` — tidak perlu install global. Proyek dibuat sebagai **web app standalone**; `db_()` membuat spreadsheet sendiri lewat `SpreadsheetApp.create`, jadi tidak perlu bound ke Google Sheets.

**1. Login sekali (interaktif, di terminal Anda sendiri)**

```bash
npm run gas:login          # = clasp login, membuka browser, menyimpan ~/.clasprc.json
```

Kredensial tersimpan di `~/.clasprc.json` (di luar repo, tidak pernah di-commit).

**2. Buat proyek Apps Script — pilih salah satu**

```bash
# A. dari terminal (clasp yang membuat proyek + .clasp.json)
npm run gas:create

# B. dari editor: script.google.com → New project → Project Settings → Script ID
npm run gas:init -- <SCRIPT_ID>
```

Opsi B dipakai bila `clasp create` menanyakan direktori yang tidak kosong (proyek ini memang sudah berisi file). `gas:init` hanya menulis `.clasp.json` (`{"scriptId":"…","rootDir":"."}`) dan menolak Script ID yang bentuknya tidak valid.

**3. Push kode**

```bash
npm run gas:push           # = npm run release (build web + GAS) lalu clasp push -f
npm run gas:status         # daftar file yang akan dikirim, tanpa mengirim
```

`.claspignore` sudah diuji: yang terkirim hanya `appsscript.json`, `*.gs`, `AppShell.html`, dan `ui/*.html`. `src/`, `dist/`, `tools/`, `node_modules/`, `index.html`, `*.md`, dan `package*.json` tidak ikut.

**4. Siapkan database (sekali, dari editor Apps Script)**

Pilih fungsi `setup` → **Run** → izinkan scope yang diminta. Jalankan sebagai **pemilik akun** sebelum URL dibagikan, agar spreadsheet database berada di Drive Anda (dengan `executeAs: USER_ACCESSING`, pengunjung pertama yang menjalankan `db_()` akan membuat database di Drive-nya sendiri). Fungsi ini membuat spreadsheet **“IbadahKu Database”** berisi seluruh sheet (`Users`, `Profiles`, `PrayerLog`, … `Targets`, `TargetMissions`) dan menyimpan `SPREADSHEET_ID` di **User Properties**, yaitu satu nilai per akun, sehingga setiap pengguna punya spreadsheet sendiri di Drive-nya dan dua akun tidak saling menimpa ID. Bila ID lama masih tersimpan di Script Properties (versi sebelum perbaikan ini), ID itu dimigrasikan otomatis ke akun yang memang punya akses lalu dihapus dari Script Properties; akun lain membuat spreadsheet sendiri. Opsional: `setupTriggers` untuk pengingat Google Calendar + laporan email, `removeTriggers` untuk mencabutnya.

**5. Deploy web app**

```bash
npm run gas:deploy         # = clasp deploy -d IbadahKu, mencetak URL /exec
npm run gas:open           # buka editor Apps Script
```

Atau dari editor: **Deploy → New deployment → Web app**, *Execute as*: **User accessing the web app**, *Who has access*: **Anyone** (harus login Google agar `Session.getActiveUser().getEmail()` terbaca dan data terpisah per akun). Ini sama dengan `appsscript.json`: `executeAs: USER_ACCESSING`, `access: ANYONE`, dan `doGet` memakai `XFrameOptionsMode.ALLOWALL` sehingga bisa di-iframe oleh `index.html`.

**Update berikutnya:** `npm run gas:push` → editor → **Deploy → Manage deployments → Edit → Version: New version** (atau `npm run gas:deploy` untuk deployment baru), supaya URL `/exec` yang sama ikut memakai kode terbaru.

> Catatan: `npm run gas:login` tidak bisa diselesaikan dari lingkungan cloud tanpa browser. Login harus dijalankan di komputer Anda (atau lewat `clasp login --no-localhost` lalu tempel kode verifikasi langsung di terminal, bukan di chat).

### 14.4 Belum dikerjakan / perlu verifikasi

- [ ] **Belum diuji di Apps Script asli** — seluruh backend belum pernah dieksekusi di runtime GAS (butuh `clasp` + akun Google). Yang sudah diverifikasi: sintaks, kontrak data mock↔GAS, dan endpoint API eksternal.
- [ ] **Pembaca Al-Qur'an** (114 surat + audio + tafsir) — backend `quran.surahs` & `quran.log` sudah ada, view reader baru menampilkan ayat pilihan statis.
- [x] Sholat sunnah, qadha counter, hafalan/murojaah, kalender hijriah — selesai 3 Nov 2026 (§14.6).
- [x] Mode Ramadhan (imsakiyah, tarawih, tadarus, i'tikaf/zakat/sedekah) — selesai 3 Nov 2026 (§14.7).
- [x] Laporan bulanan siap dibagikan (kartu gambar, teks WhatsApp, cetak/PDF) — selesai 3 Nov 2026 (§14.8).
- [x] Grup keluarga / akun pendamping dengan izin baca-saja — selesai 3 Nov 2026 (§14.10).
- [ ] Uji kuota nyata (100× `bootstrap`) dan uji dua akun untuk isolasi data.
- [ ] Uji browser manual oleh pengguna (dark mode, flatpickr, Swal, chart) — smoke test DOM tidak menggantikan pemeriksaan visual.

### 14.5 Catatan teknis hasil implementasi

- **CSP & compiler Vue**: template disimpan terpusat di `src/js/templates.js` dan dikompilasi browser build Vue. Bila sandbox HtmlService memblokir `unsafe-eval`, gejalanya app kosong tanpa error jelas — jalur mundur: precompile template (mis. `vue/compiler-dom` + render function saat build). **Belum diuji di GAS.**
- **Ukuran output**: `ui/Styles.html` ±36 KB, `ui/App.html` ±61 KB — jauh di bawah batas, ApexCharts tetap dimuat dari CDN (lazy by route).
- **`google.script.run` tidak tersedia di preview** sehingga `src/js/core.js` memilih transport otomatis: GAS bila ada, mock (`localStorage`) bila tidak.
- **Angka & tanggal** memakai `Intl` locale `id-ID`; penyimpanan tanggal selalu `YYYY-MM-DD` string.

### 14.6 Fase 2 — amalan pendukung (selesai 3 Nov 2026)

| Fitur | UI | Action backend | Penyimpanan |
|---|---|---|---|
| Sholat sunnah (rawatib, dhuha, tahajud, witir) | kartu stepper di tab Sholat | `sunnah.get`, `sunnah.mark` | `SunnahLog` |
| Qadha counter (5 sholat + puasa) | tombol −/+ per jenis + badge total | `qadha.adjust` | `Qadha` (sheet baru) |
| Hafalan & murojaah | kartu di tab Al-Qur'an + dialog skor 1–5 | `hafalan.list`, `hafalan.save`, `hafalan.review` | `Hafalan` (sheet baru) |
| Kalender hijriah | route baru `#/kalender`: grid dwi-tanggal, detail hari, hari besar | `hijri.month` | dihitung di kode, tanpa sheet |

Aturan yang ditanam di kode (bukan hardcode di UI):

- **Jarak murojaah** `1·3·7·14·30` hari (`HAFALAN_INTERVALS`). Skor ≥4 menaikkan tingkat berikutnya; skor ≤3 mengulang dari 1 hari.
- **Puasa sunnah**: Senin/Kamis, Ayyamul Bidh (13–15 hijriah), Arafah (9 Dzulhijjah), Asyura (10 Muharram) — **ditiadakan** pada Idul Fitri, Idul Adha, dan hari Tasyrik (`HARAM_FASTING`).
- **Hari besar** disimpan sebagai peta `bulan-hari` hijriah dan dipakai bersama oleh `core.js` (mock/preview) dan `AmalanService.gs` (produksi), agar tampilan dan API tidak bisa berbeda.
- Semua penulisan baru tetap memakai `LockService` + validasi enum + batas tanggal (tidak boleh masa depan, maksimal 1 tahun ke belakang).

Verifikasi fase ini: `npm run check` 11/11 template · `npm run smoke` 11/11 cek (termasuk grid kalender) dengan **0 error runtime** · `node --check` semua `.gs` lolos · `ui/App.html` 79,2 KB.

Catatan: angka qadha dan hafalan pada mode demo adalah data contoh yang dibuat otomatis (`seedQadha`, `seedHafalan`) supaya tampilan tidak kosong; di backend GAS keduanya dimulai dari nol milik pengguna.

### 14.7 Mode Ramadhan (selesai 3 Nov 2026)

Route `#/ramadhan` (item sidebar, banner hitung mundur di dasbor, judul "Mode Ramadhan").

| Bagian | Isi | Action / penyimpanan |
|---|---|---|
| Imsakiyah | imsak, subuh, terbit, dzuhur, ashar, maghrib (berbuka), isya + hitung mundur imsak & berbuka per detik | `ramadhan.day` (memakai `daySchedule_`) |
| Tarawih | pilihan 0/8/11/20/23 rakaat, tombol ±2, target 20 | `ramadhan.save` → sheet `RamadhanLog` |
| Tadarus | target harian 21 halaman (604 ÷ 30), stepper + input, total bulan & % khatam | idem |
| Amalan | i'tikaf, zakat fitrah (status + nominal), sedekah harian | idem |
| Rekap | hari tarawih, total rakaat, halaman, total sedekah (agregasi baris pada bulan hijriah yang sama) | `ramadhanAggregate_` / `ramadhanAggregate` |

Perilaku yang disengaja:

- Di luar Ramadhan, halaman menampilkan hitung mundur ke 1 Ramadhan berikutnya dan **tetap** menampilkan imsakiyah. Pemilih tanggal (maksimal hari ini) bisa diarahkan ke Ramadhan sebelumnya untuk mengisi catatan secara *backfill*.
- `ramadhanMeta()` (`core.js`) dan `ramadhanMeta_()` (`RamadhanService.gs`) memakai algoritma hijriah yang sama, sehingga label "hari ke-N" konsisten antara preview dan produksi.
- Validasi server: tarawih 0–36 rakaat, tadarus 0–60 halaman/hari, nominal 0–1 M, tanggal tidak boleh masa depan dan maksimal 400 hari ke belakang.
- Nominal sedekah/zakat hanya catatan pribadi — **tidak ada** integrasi pembayaran, sesuai batas platform di §6.5.

Verifikasi: `npm run check` 12/12 template · `npm run smoke` 12/12 cek, 0 error runtime · `node --check` semua `.gs` lolos · `ui/App.html` 93,6 KB · `ui/Styles.html` 37,9 KB · server preview 200.

### 14.8 Laporan bulanan siap dibagikan (selesai 3 Nov 2026)

Bagian baru di atas halaman **Laporan** (`#/laporan`), action backend `report.month` ([ReportService.gs](ReportService.gs)).

| Keluaran | Cara kerja | Catatan |
|---|---|---|
| Kartu gambar | `<canvas>` 1080×1350 digambar langsung dengan Canvas 2D (gradien brand, arc kepatuhan, 8 statistik, bar per waktu) | berikut tombol **Unduh PNG** |
| Bagikan | `navigator.share` + `File` PNG bila didukung; otomatis jatuh ke unduh PNG | butuh HTTPS dan dukungan perangkat |
| Teks WhatsApp | ringkasan Markdown-WhatsApp di-**Salin teks** atau buka `wa.me/?text=` | aman tanpa izin tambahan |
| Cetak / PDF | `window.print()` + CSS `@media print` yang menyembunyikan seluruh UI dan hanya menampilkan `.print-report` | menghasilkan PDF lewat dialog "Save as PDF" |
| Rekap Ramadhan | bila bulan terpilih memuat hari Ramadhan, kartu menampilkan tarawih, tadarus, sedekah | memakai `RamadhanLog` |

Isi laporan: kepatuhan %, jumlah jamaah/tepat/qadha/belum, per-waktu sholat, tilawah halaman & hari, dzikir, sholat sunnah, jumlah hafalan & jatuh tempo, streak, hari besar pada bulan itu, hari terbaik, dan waktu sholat yang paling sering terlewat.

Penyimpangan kecil: ekspor PDF memakai dialog cetak browser (bukan pustaka jsPDF) supaya tidak menambah ±300 KB CDN dan tetap menghasilkan teks yang bisa dipilih/di-search di PDF.

Verifikasi: `npm run check` 12/12 template · `npm run smoke` **15/15 cek**, 0 error runtime (termasuk `monthly-card`, `share-buttons`, `print-block`) · `node --check` semua `.gs` lolos · `ui/App.html` 106,5 KB · `ui/Styles.html` 38,5 KB · server preview 200.

### 14.9 Personalisasi kartu laporan (selesai 3 Nov 2026)

| Pengaturan | Pilihan | Efek |
|---|---|---|
| Palet | Zamrud, Madinah, Samudra, Senja, Monokrom | gradien latar + warna aksen (arc, bar, label), masing-masing punya varian khusus tema gelap & terang agar kontras tetap aman |
| Tema kartu | Gelap / Terang | terpisah dari tema aplikasi, jadi aplikasi bisa terang sementara kartu gelap |
| Nama | Tampilkan / sembunyikan | bila disembunyikan, baris nama dihilangkan tanpa menggeser tata letak statistik |

Tempat mengatur:

- **Halaman Laporan** — panel kecil di bawah pratinjau kartu; setiap perubahan langsung menggambar ulang kanvas **dan** menyimpan ke profil (`profile.save`), jadi tidak perlu menekan tombol.
- **Halaman Pengaturan** — bagian "Kartu laporan" dengan palet, tema, dan toggle nama; berlaku saat "Simpan pengaturan" ditekan.

Perubahan teknis:

- Penggambaran kartu dipindah ke modul sendiri [src/js/card.js](src/js/card.js) (`drawReportCard`), sehingga `views.js` tinggal memanggilnya dan kode palet tidak bercampur dengan logika view.
- `CARD_PALETTES` di `core.js` menjadi satu sumber warna; setiap palet menyimpan `dark[]`, `light[]`, `accentDark`, `accentLight`.
- Profil mendapat 3 kolom baru: `card_palette`, `card_theme`, `card_show_name`. Karena spreadsheet lama belum punya kolom itu, `Repo.gs` kini menjalankan `ensureColumns_()` yang **menambahkan header baru di akhir** tanpa menggeser data yang sudah ada (migrasi aman).
- Nilai divalidasi di server: palet hanya 5 pilihan itu, tema hanya `dark`/`light`, nama disimpan sebagai `TRUE`/`FALSE` dan dibaca kembali lewat `asBool_`.

Verifikasi: `npm run check` 12/12 template · `npm run smoke` **16/16 cek**, 0 error runtime (termasuk `card-style-controls`) · `node --check` semua `.gs` lolos · `ui/App.html` 111,3 KB · `ui/Styles.html` 38,8 KB · server preview 200.

Batasan: keindahan tiap palet (terutama tema terang pada palet Monokrom/Madinah) belum dicek secara visual oleh manusia — smoke test hanya memastikan tombol dan kanvas ada tanpa error.

### 14.10 Grup keluarga / akun pendamping (selesai 3 Nov 2026)

Route `#/keluarga` (item sidebar, kartu di dasbor, judul "Grup Keluarga").

**Alur izin (satu arah, berbasis persetujuan):**

1. Pemilik akun memasukkan email Google anggota → baris `Family` dibuat dengan status `pending`. `member_id` langsung dihitung dari hash email (`emailId_`), jadi anggota bisa diundang sebelum pernah membuka aplikasi.
2. Anggota membuka aplikasi → undangan muncul di bagian "Undangan untuk Anda" (dicocokkan lewat `Session.getActiveUser().getEmail()`), lalu **Terima** → status `active`, atau **Tolak** → `declined`.
3. Pemilik hanya bisa melihat ringkasan setelah status `active`. Baik pemilik maupun anggota dapat mencabut kapan saja → status `revoked` (riwayat tetap tersimpan, tidak dihapus).

**Isi ringkasan (action `family.member`)** — kepatuhan 7 & 30 hari, streak, halaman tilawah 7 hari, hitungan dzikir 7 hari, sholat tercatat 7 hari, heatmap 14 hari, dan waktu terakhir aktif. **Tidak pernah dikirim:** jurnal muhasabah, catatan, nominal sedekah/zakat, isi hafalan, dan detail per-ayat.

**Batas & validasi:** maksimal 5 anggota (aktif + menunggu) per akun, tidak boleh mengundang diri sendiri, duplikat email ditolak, validasi format email, hanya pemilik yang boleh membuka `family.member`, dan hanya anggota yang dituju yang boleh menerima undangan.

**Teknis:** sheet baru `Family` (7 kolom) di `Repo.gs`, service [FamilyService.gs](FamilyService.gs), serta mock demo berisi 2 anggota aktif (Aisyah, Yusuf) dan 1 undangan menunggu (Fatimah) dengan statistik deterministik.

Verifikasi: `npm run check` **13/13** template · `npm run smoke` **17/17 cek**, 0 error runtime (termasuk route `keluarga`) · `node --check` semua `.gs` lolos · `ui/App.html` 123,4 KB · `ui/Styles.html` 39,1 KB · server preview 200.

Batasan: undangan bersifat **in-app** — belum ada email/notifikasi otomatis ke anggota (bisa ditambahkan lewat `Notify.gs`), dan seluruh backend tetap belum dieksekusi di runtime Apps Script asli.

### 14.11 Target bersama — misi hafalan & tanda selesai (selesai 3 Nov 2026)

Route `#/target` (item sidebar "Target", kartu di dasbor, judul "Target Bersama").

**Konsep:** satu target berisi judul (mis. *Hafal QS. Al-Mulk 1–15*), tenggat opsional, dan daftar misi. Target ditujukan ke anggota keluarga yang izinnya sudah `active`, atau ke diri sendiri. **Kedua pihak dapat mencentang misi**; setiap tanda selesai menyimpan siapa yang mencentang dan kapan, lalu ditampilkan sebagai *"Selesai oleh Aisyah · 1 Nov"*.

**Alur:**

1. Pendamping membuka **Target** → isi judul, pilih anggota (atau "Saya sendiri"), tenggat opsional, lalu daftar misi (maks. 10 saat dibuat).
2. Target muncul di halaman anggota karena target dibaca berdasarkan `owner_id` **atau** `member_id`.
3. Misi dicentang dari perangkat mana pun → membalik status. Bila semua misi tuntas, target otomatis berstatus `done` dan mendapat lencana **Selesai ✓**.
4. Misi bisa ditambah kapan saja (maks. 20 per target, tanpa duplikat); target `done` kembali `active` bila ada misi baru.
5. Pembuat target dapat menghapus (arsip lembut, `status=archived`).

**Data:** sheet baru `Targets` (10 kolom) dan `TargetMissions` (9 kolom) di `Repo.gs`; service [TargetService.gs](TargetService.gs). Batas: 12 target aktif per akun.

**Otorisasi:** hanya `owner_id` atau `member_id` yang cocok dengan sesi dapat membaca/mengubah. `member_id` hanya boleh diisi lewat tautan `Family` berstatus `active` milik pengguna, jadi target tidak bisa dibagikan ke akun asing. Menghapus target hanya boleh pembuatnya.

**Privasi:** yang dibagikan hanya judul, daftar misi, dan status centang — jurnal muhasabah, catatan pribadi, nominal sedekah/zakat, dan detail hafalan pribadi tidak pernah ikut.

Verifikasi: `npm run check` **14/14** template · `npm run smoke` **19/19 cek**, 0 error runtime · `node --check` semua `.gs` lolos · server preview 200.

Batasan: belum ada pengingat otomatis untuk misi yang mendekati tenggat, dan seluruh backend tetap belum dijalankan di runtime Apps Script asli.
