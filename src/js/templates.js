/**
 * Semua template Vue (satu tempat agar mudah divalidasi oleh tools/check-templates.mjs).
 * Template dikompilasi di browser oleh build global Vue yang memuat compiler.
 */

export const tplRoot = /* html */ `
<div class="min-h-screen lg:flex">
  <side-nav></side-nav>
  <div class="min-w-0 flex-1 pb-24 lg:pb-10">
    <div v-if="busy" class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-gold/30">
      <div class="h-full w-1/3 animate-pulse bg-gold"></div>
    </div>

    <top-bar></top-bar>

    <main class="mx-auto w-full max-w-3xl px-4 pt-4 sm:px-6">
      <p v-if="state.error" class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ state.error }}</p>

      <div v-if="!state.ready" class="space-y-3" aria-busy="true" aria-live="polite" aria-label="Memuat data ibadah">
        <div class="card animate-pulse p-5">
          <div class="h-3 w-24 rounded bg-line/80 dark:bg-[#174438]"></div>
          <div class="mt-3 h-7 w-40 rounded bg-line/80 dark:bg-[#174438]"></div>
          <div class="mt-4 h-11 w-full rounded-xl bg-line/60 dark:bg-[#12312a]"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="n in 4" :key="n" class="card animate-pulse p-4">
            <div class="h-3 w-12 rounded bg-line/80 dark:bg-[#174438]"></div>
            <div class="mt-2 h-6 w-16 rounded bg-line/60 dark:bg-[#12312a]"></div>
          </div>
        </div>
        <div class="card animate-pulse space-y-3 p-5">
          <div v-for="n in 5" :key="n" class="h-4 rounded bg-line/60 dark:bg-[#12312a]"></div>
        </div>
        <p class="text-center text-xs text-muted">Menyiapkan jadwal dan catatan ibadah…</p>
      </div>

      <template v-else>
        <dashboard-view v-if="state.route === 'beranda'"></dashboard-view>
        <sholat-view v-else-if="state.route === 'sholat'"></sholat-view>
        <quran-view v-else-if="state.route === 'quran'"></quran-view>
        <dzikir-view v-else-if="state.route === 'dzikir'"></dzikir-view>
        <laporan-view v-else-if="state.route === 'laporan'"></laporan-view>
        <kalender-view v-else-if="state.route === 'kalender'"></kalender-view>
        <ramadhan-view v-else-if="state.route === 'ramadhan'"></ramadhan-view>
        <keluarga-view v-else-if="state.route === 'keluarga'"></keluarga-view>
        <target-view v-else-if="state.route === 'target'"></target-view>
        <pengaturan-view v-else></pengaturan-view>
      </template>

      <footer class="mt-8 pb-2 text-center text-[11px] leading-relaxed text-muted">
        Jadwal bersifat perkiraan — sesuaikan koreksi menit dengan masjid setempat.<br />
        Sumber: Bimas Islam Kemenag (myQuran) · Aladhan · EQuran.id
        <span class="block">IbadahKu v0.1 <span v-if="state.demo">· mode demo</span></span>
      </footer>
    </main>

    <bottom-nav></bottom-nav>
  </div>
</div>
`;

export const tplTopBar = /* html */ `
<header class="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur dark:border-[#174438] dark:bg-[#071c17]/90">
  <div class="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
    <div class="min-w-0 flex-1">
      <p class="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">{{ hijri || 'Kalender hijriah' }}</p>
      <h1 class="truncate text-lg font-bold leading-tight">{{ title }}</h1>
    </div>
    <button class="btn-ghost !min-h-10 !px-2.5" type="button" aria-label="Buka kalender hijriah" @click="go('kalender')">
      <span class="material-symbols-rounded !text-[20px]">calendar_month</span>
    </button>
    <button class="btn-ghost !min-h-10 !px-2.5" type="button" :aria-label="dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'" @click="toggle">
      <span class="material-symbols-rounded !text-[20px]">{{ dark ? 'light_mode' : 'dark_mode' }}</span>
    </button>
    <button class="btn-ghost !min-h-10 !px-2.5" type="button" aria-label="Buka pengaturan" @click="go('pengaturan')">
      <span class="material-symbols-rounded !text-[20px]">settings</span>
    </button>
  </div>
</header>
`;

export const tplBottomNav = /* html */ `
<nav class="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-[#174438] dark:bg-[#0c2a23]/95 lg:hidden" aria-label="Navigasi utama">
  <ul class="mx-auto flex max-w-md items-stretch">
    <li v-for="item in items" :key="item.route" class="flex-1">
      <button
        type="button"
        class="flex w-full flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition"
        :class="state.route === item.route ? 'text-brand dark:text-[#7fdcc4]' : 'text-muted'"
        :aria-current="state.route === item.route ? 'page' : undefined"
        @click="go(item.route)"
      >
        <span class="material-symbols-rounded !text-[22px]" :class="{ filled: state.route === item.route }">{{ item.icon }}</span>
        {{ item.label }}
      </button>
    </li>
  </ul>
</nav>
`;

export const tplSideNav = /* html */ `
<aside class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line/70 bg-white px-4 py-6 dark:border-[#174438] dark:bg-[#0c2a23] lg:flex">
  <div class="flex items-center gap-2 px-2">
    <span class="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
      <span class="material-symbols-rounded">mosque</span>
    </span>
    <div>
      <p class="text-sm font-bold leading-tight">IbadahKu</p>
      <p class="text-[10px] text-muted">Ibadah harian</p>
    </div>
  </div>

  <nav class="mt-6 flex-1" aria-label="Navigasi samping">
    <ul class="space-y-1">
      <li v-for="item in items" :key="item.route">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition"
          :class="state.route === item.route ? 'bg-brand-soft text-brand dark:bg-[#103328] dark:text-[#7fdcc4]' : 'text-muted hover:bg-paper dark:hover:bg-[#103328]'"
          @click="go(item.route)"
        >
          <span class="material-symbols-rounded !text-[20px]" :class="{ filled: state.route === item.route }">{{ item.icon }}</span>
          {{ item.label }}
        </button>
      </li>
    </ul>
  </nav>

  <div class="rounded-xl bg-brand-deep px-4 py-3 text-white">
    <p class="text-[10px] uppercase tracking-wider text-white/60">Streak</p>
    <p class="text-xl font-bold">{{ state.streak }} hari</p>
    <p class="mt-0.5 text-[10px] text-white/60">Sholat lengkap berturut-turut</p>
  </div>
</aside>
`;

export const tplDashboard = /* html */ `
<div class="space-y-4">
  <button
    v-if="ramadhanBanner"
    type="button"
    class="card flex w-full items-center gap-3 border-gold/40 bg-gold-soft/70 px-4 py-3 text-left transition hover:border-gold dark:border-[#5c4a12] dark:bg-[#2a2411]"
    @click="go('ramadhan')"
  >
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/20 text-[#8a6d10] dark:text-gold">
      <span class="material-symbols-rounded !text-[20px]">nightlight</span>
    </span>
    <span class="min-w-0 flex-1 text-xs font-semibold text-[#7a5f0e] dark:text-gold">{{ ramadhanBanner }}</span>
    <span class="material-symbols-rounded !text-[18px] text-[#8a6d10] dark:text-gold">chevron_right</span>
  </button>

  <section class="card overflow-hidden">
    <div class="relative bg-gradient-to-br from-brand-deep via-[#0d5145] to-brand px-5 pb-5 pt-4 text-white">
      <div class="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/5"></div>
      <div class="relative flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[11px] font-medium text-white/70">Assalamualaikum,</p>
          <p class="truncate text-xl font-bold leading-tight">{{ profile.nama || 'Sahabat' }}</p>
        </div>
        <button type="button" class="chip !border-white/25 !bg-white/10 !text-white" @click="go('sholat')">
          <span class="material-symbols-rounded !text-[16px]">location_on</span>
          <span class="max-w-[9rem] truncate">{{ today.cityName || 'Pilih kota' }}</span>
        </button>
      </div>

      <div class="relative mt-5 flex items-end justify-between gap-4">
        <div class="min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">Sholat berikutnya</p>
          <p class="mt-0.5 flex items-baseline gap-2">
            <span class="text-2xl font-bold">{{ next.name }}</span>
            <span class="font-mono text-base font-semibold text-gold">{{ next.time }}</span>
          </p>
          <p class="mt-1 truncate text-[11px] text-white/60">
            setelah {{ next.prev || '—' }}<span v-if="next.tomorrow"> · besok</span>
          </p>
        </div>
        <div class="text-right">
          <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">Menuju adzan</p>
          <p class="font-mono text-xl font-bold tabular-nums">{{ countdown }}</p>
        </div>
      </div>

      <div class="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div class="h-full rounded-full bg-gold transition-all duration-700" :style="{ width: next.progress + '%' }"></div>
      </div>
    </div>

    <div class="grid grid-cols-5 divide-x divide-line/70 dark:divide-[#174438]">
      <button
        v-for="p in prayers"
        :key="p.key"
        type="button"
        class="flex flex-col items-center gap-1 py-3 transition hover:bg-brand-soft/60 dark:hover:bg-[#103328]"
        @click="mark(p.key)"
      >
        <span class="material-symbols-rounded !text-[20px]" :class="statusMeta(marks[p.key]).color">{{ statusMeta(marks[p.key]).icon }}</span>
        <span class="text-[11px] font-semibold">{{ p.label }}</span>
        <span class="font-mono text-[10px] text-muted">{{ today.schedule ? today.schedule[p.key] : '--:--' }}</span>
      </button>
    </div>
  </section>

  <div class="grid grid-cols-3 gap-3">
    <div class="card px-4 py-3">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Streak</p>
      <p class="stat-value">{{ state.streak }}<span class="ml-1 text-xs font-semibold text-muted">hari</span></p>
      <p class="mt-0.5 text-[10px] leading-tight text-muted">5 sholat lengkap</p>
    </div>
    <div class="card px-4 py-3">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Tilawah</p>
      <p class="stat-value">{{ quran.todayPages || 0 }}<span class="ml-1 text-xs font-semibold text-muted">/ {{ quran.target || 0 }}</span></p>
      <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-brand-soft dark:bg-[#103328]">
        <div class="h-full rounded-full bg-brand" :style="{ width: quranPct + '%' }"></div>
      </div>
    </div>
    <div class="card px-4 py-3">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">30 hari</p>
      <p class="stat-value">{{ stats.percent || 0 }}<span class="ml-0.5 text-xs font-semibold text-muted">%</span></p>
      <p class="mt-0.5 text-[10px] leading-tight text-muted">{{ stats.donePrayers || 0 }}/{{ stats.totalPrayers || 0 }} sholat</p>
    </div>
  </div>

  <section class="card px-4 py-4">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-bold">Amalan 14 hari</h2>
      <button class="btn-quiet" type="button" @click="go('laporan')">
        Laporan
        <span class="material-symbols-rounded !text-[16px]">arrow_forward</span>
      </button>
    </div>
    <div class="mt-3 grid grid-cols-7 gap-1.5">
      <div
        v-for="d in last14"
        :key="d.date"
        class="flex aspect-square items-center justify-center rounded-lg text-[10px] font-bold"
        :class="levelClass(d.score)"
        :title="d.date + ' · ' + d.score + '/5'"
      >
        <span v-if="d.score >= 5">✓</span>
      </div>
    </div>
    <div class="mt-3 flex items-center gap-1.5 text-[10px] text-muted">
      <span>Kosong</span>
      <span class="h-2.5 w-2.5 rounded bg-[#EEF2EF] dark:bg-[#12312a]"></span>
      <span class="h-2.5 w-2.5 rounded bg-brand/25"></span>
      <span class="h-2.5 w-2.5 rounded bg-brand/55"></span>
      <span class="h-2.5 w-2.5 rounded bg-brand"></span>
      <span>Lengkap</span>
    </div>
  </section>

  <section class="grid grid-cols-2 gap-3">
    <button type="button" class="card flex items-center gap-3 px-4 py-3 text-left transition hover:border-brand/40" @click="openTilawah">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand dark:bg-[#103328] dark:text-[#7fdcc4]">
        <span class="material-symbols-rounded">menu_book</span>
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm font-semibold">Catat tilawah</span>
        <span class="block text-[11px] text-muted">Target {{ quran.target || 4 }} halaman</span>
      </span>
    </button>
    <button type="button" class="card flex items-center gap-3 px-4 py-3 text-left transition hover:border-brand/40" @click="go('dzikir')">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-[#8a6d10] dark:bg-[#173a30] dark:text-gold">
        <span class="material-symbols-rounded">self_improvement</span>
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm font-semibold">Tasbih digital</span>
        <span class="block text-[11px] text-muted">{{ dhikr.todayCount || 0 }}× hari ini</span>
      </span>
    </button>
  </section>

  <section class="grid grid-cols-2 gap-3">
    <button type="button" class="card flex items-center gap-3 px-4 py-3 text-left transition hover:border-brand/40" @click="go('kalender')">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand dark:bg-[#103328] dark:text-[#7fdcc4]">
        <span class="material-symbols-rounded">calendar_month</span>
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm font-semibold">Kalender hijriah</span>
        <span class="block text-[11px] text-muted">Hari besar &amp; puasa sunnah</span>
      </span>
    </button>
    <button type="button" class="card flex items-center gap-3 px-4 py-3 text-left transition hover:border-brand/40" @click="go('quran')">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-[#8a6d10] dark:bg-[#173a30] dark:text-gold">
        <span class="material-symbols-rounded">psychology</span>
      </span>
      <span class="min-w-0">
        <span class="block truncate text-sm font-semibold">Hafalan</span>
        <span class="block text-[11px] text-muted">{{ state.hafalan.dueCount || 0 }} jatuh tempo</span>
      </span>
    </button>
  </section>

  <button
    type="button"
    class="card flex w-full items-center gap-3 px-4 py-3 text-left transition hover:border-brand/40"
    @click="go('keluarga')"
  >
    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand dark:bg-[#103328] dark:text-[#7fdcc4]">
      <span class="material-symbols-rounded">groups</span>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-semibold">Grup keluarga</span>
      <span class="block text-[11px] text-muted">Pantau ringkasan pasangan/anak</span>
    </span>
    <span class="material-symbols-rounded !text-[18px] text-muted">chevron_right</span>
  </button>

  <button
    type="button"
    class="card flex w-full items-center gap-3 px-4 py-3 text-left transition hover:border-gold/40"
    @click="go('target')"
  >
    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-[#8a6d10] dark:bg-[#2a2411] dark:text-gold">
      <span class="material-symbols-rounded">checklist</span>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-semibold">Target bersama</span>
      <span class="block text-[11px] text-muted">Misi hafalan anak &amp; tanda selesai</span>
    </span>
    <span class="material-symbols-rounded !text-[18px] text-muted">chevron_right</span>
  </button>

  <section class="card px-4 py-4">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-bold">Muhasabah hari ini</h2>
      <button class="btn-quiet" type="button" @click="openJournal">
        <span class="material-symbols-rounded !text-[16px]">edit_note</span>
        Tulis
      </button>
    </div>
    <p class="mt-2 text-xs leading-relaxed text-muted">
      Luangkan dua menit: syukuri satu hal, akui satu kekurangan, lalu titipkan satu doa. Catatan hanya untuk Anda.
    </p>
  </section>

  <!-- modal tilawah -->
  <div v-if="modal === 'tilawah'" class="fixed inset-0 z-50 flex items-end justify-center bg-brand-deep/40 sm:items-center sm:p-4" @click.self="modal = ''">
    <div class="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[#0c2a23] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="tilawah-title">
      <div class="flex items-center justify-between">
        <h3 id="tilawah-title" class="text-base font-bold">Catat tilawah</h3>
        <button type="button" class="btn-quiet" aria-label="Tutup" @click="modal = ''">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="mt-4 space-y-3">
        <div>
          <label class="label" for="tilawah-surah">Surat</label>
          <select id="tilawah-surah" v-model="form.surah" class="input">
            <option v-for="s in surahs" :key="s.nomor" :value="s.nama">{{ s.nomor }}. {{ s.nama }}</option>
          </select>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="label" for="tilawah-ayat1">Ayat dari</label>
            <input id="tilawah-ayat1" v-model.number="form.ayahFrom" type="number" min="1" class="input" />
          </div>
          <div>
            <label class="label" for="tilawah-ayat2">Sampai</label>
            <input id="tilawah-ayat2" v-model.number="form.ayahTo" type="number" min="1" class="input" />
          </div>
          <div>
            <label class="label" for="tilawah-pages">Halaman</label>
            <input id="tilawah-pages" v-model.number="form.pages" type="number" min="1" max="60" class="input" />
          </div>
        </div>
        <div>
          <label class="label" for="tilawah-mode">Jenis bacaan</label>
          <select id="tilawah-mode" v-model="form.mode" class="input">
            <option value="tilawah">Tilawah</option>
            <option value="hafalan">Hafalan baru</option>
            <option value="murojaah">Murojaah</option>
          </select>
        </div>
      </div>
      <div class="mt-5 flex gap-2">
        <button type="button" class="btn-ghost flex-1" @click="modal = ''">Batal</button>
        <button type="button" class="btn-primary flex-1" :disabled="saving" @click="saveTilawah">{{ saving ? 'Menyimpan…' : 'Simpan' }}</button>
      </div>
    </div>
  </div>

  <!-- modal jurnal -->
  <div v-if="modal === 'journal'" class="fixed inset-0 z-50 flex items-end justify-center bg-brand-deep/40 sm:items-center sm:p-4" @click.self="modal = ''">
    <div class="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[#0c2a23] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="journal-title">
      <div class="flex items-center justify-between">
        <h3 id="journal-title" class="text-base font-bold">Muhasabah {{ dateLabel }}</h3>
        <button type="button" class="btn-quiet" aria-label="Tutup" @click="modal = ''">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="mt-4 space-y-3">
        <div>
          <label class="label" for="journal-syukur">Yang disyukuri</label>
          <textarea id="journal-syukur" v-model="journal.syukur" rows="2" maxlength="2000" class="input !min-h-16 py-2"></textarea>
        </div>
        <div>
          <label class="label" for="journal-muhasabah">Muhasabah</label>
          <textarea id="journal-muhasabah" v-model="journal.muhasabah" rows="2" maxlength="2000" class="input !min-h-16 py-2"></textarea>
        </div>
        <div>
          <label class="label" for="journal-doa">Doa</label>
          <textarea id="journal-doa" v-model="journal.doa" rows="2" maxlength="2000" class="input !min-h-16 py-2"></textarea>
        </div>
      </div>
      <div class="mt-5 flex gap-2">
        <button type="button" class="btn-ghost flex-1" @click="modal = ''">Batal</button>
        <button type="button" class="btn-primary flex-1" :disabled="saving" @click="saveJournal">{{ saving ? 'Menyimpan…' : 'Simpan' }}</button>
      </div>
    </div>
  </div>
</div>
`;

export const tplSholat = /* html */ `
<div class="space-y-4">
  <section class="card px-4 py-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-sm font-bold">Jadwal sholat</h2>
        <p class="truncate text-[11px] text-muted">{{ profile.cityName || 'Pilih kota' }} · {{ hijriLabel }}</p>
      </div>
      <div class="flex items-center gap-2">
        <input ref="dateEl" class="input !w-40" readonly aria-label="Pilih tanggal jadwal" />
        <button type="button" class="btn-ghost !px-3" aria-label="Ganti kota" @click="openCity">
          <span class="material-symbols-rounded !text-[18px]">location_on</span>
        </button>
      </div>
    </div>

    <p v-if="loading" class="py-6 text-center text-xs text-muted">Memuat jadwal…</p>
    <p v-else-if="!dayEntry" class="py-6 text-center text-xs text-muted">Jadwal untuk tanggal ini belum tersedia.</p>

    <div v-else class="mt-3 divide-y divide-line/70 dark:divide-[#174438]">
      <div v-for="row in rows" :key="row.key" class="flex items-center gap-3 py-2.5">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand dark:bg-[#103328] dark:text-[#7fdcc4]">
          <span class="material-symbols-rounded !text-[18px]">{{ row.icon }}</span>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">{{ row.label }}</p>
          <p class="text-[11px] text-muted">{{ row.note }}</p>
        </div>
        <p class="font-mono text-sm font-semibold">{{ row.time }}</p>
        <select
          v-if="row.trackable"
          class="input !min-h-9 !w-28 !py-1 !text-xs"
          :value="dayMarks[row.key] || ''"
          :aria-label="'Status ' + row.label"
          @change="setMark(row.key, $event.target.value)"
        >
          <option value="">—</option>
          <option value="jamaah">Jamaah</option>
          <option value="tepat">Tepat</option>
          <option value="qadha">Qadha</option>
        </select>
        <span v-else class="w-28 text-right text-[10px] text-muted">—</span>
      </div>
    </div>
    <p class="mt-3 text-[10px] text-muted">Sumber: {{ source }} · tanggal hijriah {{ hijriLabel }}</p>
  </section>

  <section class="card px-4 py-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold">Sholat sunnah</h2>
        <p class="text-[11px] text-muted">Rakaat untuk {{ dayLabel(date) }}</p>
      </div>
      <span class="chip">{{ sunnahTotal }} rakaat</span>
    </div>
    <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div v-for="t in sunnahTypes" :key="t.key" class="flex items-center gap-2 rounded-xl border border-line px-3 py-2 dark:border-[#174438]">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold">{{ t.label }}</p>
          <p class="text-[10px] leading-tight text-muted">{{ t.note }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <button type="button" class="btn-quiet !min-h-7 !px-1.5" :aria-label="'Kurangi ' + t.label" @click="stepSunnah(t.key, -1)">−</button>
          <span class="w-6 text-center font-mono text-sm font-semibold">{{ sunnah[t.key] || 0 }}</span>
          <button type="button" class="btn-quiet !min-h-7 !px-1.5" :aria-label="'Tambah ' + t.label" @click="stepSunnah(t.key, 1)">+</button>
        </div>
      </div>
    </div>
  </section>

  <section class="card px-4 py-4">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold">Qadha</h2>
        <p class="text-[11px] text-muted">Sisa hutang ibadah</p>
      </div>
      <span class="chip" :class="{ 'chip-active': qadhaTotal === 0 }">{{ qadhaTotal === 0 ? 'Tuntas' : qadhaTotal + ' sisa' }}</span>
    </div>
    <ul class="mt-3 divide-y divide-line/70 dark:divide-[#174438]">
      <li v-for="q in qadha" :key="q.kind" class="flex items-center gap-2 py-2">
        <span class="flex-1 text-xs font-semibold">{{ q.label }}</span>
        <span class="w-8 text-center font-mono text-sm font-semibold">{{ q.remaining }}</span>
        <button type="button" class="btn-quiet !min-h-7 !px-2" :aria-label="'Kurangi qadha ' + q.label" @click="stepQadha(q.kind, -1)">−</button>
        <button type="button" class="btn-quiet !min-h-7 !px-2" :aria-label="'Tambah qadha ' + q.label" @click="stepQadha(q.kind, 1)">+</button>
      </li>
    </ul>
    <p class="mt-2 text-[10px] text-muted">Kurangi saat Anda mengqadha, tambah saat mencatat hutang baru.</p>
  </section>

  <section class="card px-4 py-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold">Kalender bulan ini</h2>
      <span class="text-[11px] font-semibold text-muted">{{ monthLabel }}</span>
    </div>
    <div class="mt-3 max-h-80 overflow-auto pr-1">
      <table class="w-full text-left text-xs">
        <thead class="sticky top-0 bg-white text-[10px] uppercase tracking-wide text-muted dark:bg-[#0c2a23]">
          <tr>
            <th class="py-1 pr-2 font-semibold">Tgl</th>
            <th v-for="p in prayers" :key="p.key" class="py-1 text-center font-semibold">{{ p.label.slice(0, 3) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="d in monthDays"
            :key="d.date"
            :class="d.date === selectedDate ? 'bg-gold-soft/70 font-semibold dark:bg-[#173a30]' : ''"
          >
            <td class="whitespace-nowrap py-1.5 pr-2">{{ dayLabel(d.date) }}</td>
            <td v-for="p in prayers" :key="p.key" class="py-1.5 text-center font-mono">{{ d[p.key] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <div v-if="showCity" class="fixed inset-0 z-50 flex items-end justify-center bg-brand-deep/40 sm:items-center sm:p-4" @click.self="showCity = false">
    <div class="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-white p-5 dark:bg-[#0c2a23] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="city-title">
      <div class="flex items-center justify-between">
        <h3 id="city-title" class="text-base font-bold">Pilih kota</h3>
        <button type="button" class="btn-quiet" aria-label="Tutup" @click="showCity = false">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <input v-model="cityQuery" class="input mt-3" placeholder="Cari kota, mis. Jakarta" aria-label="Cari kota" />
      <ul class="mt-2 flex-1 space-y-1 overflow-auto">
        <li v-for="c in filteredCities" :key="c.id">
          <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-soft dark:hover:bg-[#103328]" @click="pickCity(c)">
            <span class="truncate">{{ c.name }}</span>
            <span v-if="c.id === profile.cityId" class="material-symbols-rounded !text-[18px] text-brand">check</span>
          </button>
        </li>
        <li v-if="!filteredCities.length" class="px-3 py-6 text-center text-xs text-muted">Kota tidak ditemukan.</li>
      </ul>
    </div>
  </div>
</div>
`;

export const tplQuran = /* html */ `
<div class="space-y-4">
  <section class="card px-4 py-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold">Progres tilawah</h2>
        <p class="text-[11px] text-muted">Target harian {{ quran.target || 4 }} halaman</p>
      </div>
      <span class="chip chip-active">{{ quran.todayPages || 0 }}/{{ quran.target || 4 }}</span>
    </div>
    <div class="mt-3 h-2 overflow-hidden rounded-full bg-brand-soft dark:bg-[#103328]">
      <div class="h-full rounded-full bg-brand transition-all duration-500" :style="{ width: todayPct + '%' }"></div>
    </div>
    <div class="mt-4 grid grid-cols-3 gap-3 text-center">
      <div>
        <p class="stat-value">{{ quran.totalPages || 0 }}</p>
        <p class="text-[10px] leading-tight text-muted">total halaman</p>
      </div>
      <div>
        <p class="stat-value">{{ quran.khatamPct || 0 }}%</p>
        <p class="text-[10px] leading-tight text-muted">khatam (604 hlm)</p>
      </div>
      <div>
        <p class="stat-value">{{ logs.length }}</p>
        <p class="text-[10px] leading-tight text-muted">catatan terakhir</p>
      </div>
    </div>
  </section>

  <section class="card px-4 py-4">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold">Hafalan &amp; murojaah</h2>
        <p class="text-[11px] text-muted">Jadwal ulang 1·3·7·14·30 hari</p>
      </div>
      <span class="chip" :class="{ 'chip-active': hafalan.dueCount > 0 }">{{ hafalan.dueCount }} jatuh tempo</span>
    </div>

    <div class="mt-3 grid gap-2 sm:grid-cols-2">
      <div>
        <label class="label" for="h-surah">Surat</label>
        <select id="h-surah" v-model="hafalanForm.surah" class="input">
          <option v-for="s in surahs" :key="s.nomor" :value="s.nama">{{ s.nomor }}. {{ s.nama }}</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="label" for="h-ayah1">Ayat dari</label>
          <input id="h-ayah1" v-model.number="hafalanForm.ayahFrom" type="number" min="1" class="input" />
        </div>
        <div>
          <label class="label" for="h-ayah2">Sampai</label>
          <input id="h-ayah2" v-model.number="hafalanForm.ayahTo" type="number" min="1" class="input" />
        </div>
      </div>
      <div class="sm:col-span-2">
        <p class="label">Kelancaran awal</p>
        <div class="flex gap-1.5">
          <button
            v-for="s in 5"
            :key="s"
            type="button"
            class="chip flex-1 justify-center"
            :class="{ 'chip-active': hafalanForm.score === s }"
            @click="hafalanForm.score = s"
          >
            {{ s }}
          </button>
        </div>
      </div>
    </div>
    <button type="button" class="btn-primary mt-3 w-full" :disabled="savingHafalan" @click="saveHafalan">
      {{ savingHafalan ? 'Menyimpan…' : 'Tambah hafalan' }}
    </button>

    <p v-if="!hafalan.items.length" class="py-4 text-center text-xs text-muted">Belum ada hafalan tercatat.</p>
    <ul v-else class="mt-3 divide-y divide-line/70 dark:divide-[#174438]">
      <li v-for="h in hafalan.items" :key="h.id" class="flex items-center gap-2 py-2">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{{ h.surah }} <span class="font-normal text-muted">{{ h.ayahFrom }}–{{ h.ayahTo }}</span></p>
          <p class="text-[10px] text-muted">Skor {{ h.score }}/5 · berikutnya {{ shortDate(h.nextReview) }}</p>
        </div>
        <span v-if="h.due" class="chip !border-gold/50 !bg-gold-soft !text-[#7a5f0e]">jatuh tempo</span>
        <button type="button" class="btn-quiet" @click="reviewHafalan(h)">Murojaah</button>
      </li>
    </ul>
  </section>

  <section class="card px-4 py-4">
    <h2 class="text-sm font-bold">Catat bacaan</h2>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <div>
        <label class="label" for="q-surah">Surat</label>
        <select id="q-surah" v-model="form.surah" class="input">
          <option v-for="s in surahs" :key="s.nomor" :value="s.nama">{{ s.nomor }}. {{ s.nama }}</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="label" for="q-ayah1">Ayat dari</label>
          <input id="q-ayah1" v-model.number="form.ayahFrom" type="number" min="1" class="input" />
        </div>
        <div>
          <label class="label" for="q-ayah2">Sampai</label>
          <input id="q-ayah2" v-model.number="form.ayahTo" type="number" min="1" class="input" />
        </div>
      </div>
      <div>
        <label class="label" for="q-pages">Halaman</label>
        <input id="q-pages" v-model.number="form.pages" type="number" min="1" max="60" class="input" />
      </div>
      <div>
        <label class="label" for="q-mode">Jenis bacaan</label>
        <select id="q-mode" v-model="form.mode" class="input">
          <option value="tilawah">Tilawah</option>
          <option value="hafalan">Hafalan baru</option>
          <option value="murojaah">Murojaah</option>
        </select>
      </div>
    </div>
    <button type="button" class="btn-primary mt-4 w-full" :disabled="saving" @click="save">
      {{ saving ? 'Menyimpan…' : 'Simpan catatan' }}
    </button>
  </section>

  <section class="card px-4 py-4">
    <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Ayat pilihan · Al-Baqarah 255</p>
    <p class="arabic mt-2 text-2xl leading-loose">اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ</p>
    <p class="mt-2 text-xs leading-relaxed text-muted">"Allah, tidak ada tuhan selain Dia, Yang Mahahidup, Yang terus-menerus mengurus makhluk-Nya."</p>
  </section>

  <section class="card px-4 py-4">
    <h2 class="text-sm font-bold">Riwayat terakhir</h2>
    <p v-if="!logs.length" class="py-4 text-center text-xs text-muted">Belum ada catatan. Mulai dari satu halaman.</p>
    <ul v-else class="mt-2 divide-y divide-line/70 dark:divide-[#174438]">
      <li v-for="(l, i) in logs" :key="l.date + '-' + i" class="flex items-center justify-between gap-2 py-2">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{{ l.surah }}</p>
          <p class="text-[10px] text-muted">{{ shortDate(l.date) }} · {{ l.mode }}</p>
        </div>
        <span class="shrink-0 font-mono text-xs font-semibold">{{ l.pages }} hlm</span>
      </li>
    </ul>
  </section>
</div>
`;

export const tplDzikir = /* html */ `
<div class="space-y-4">
  <section class="card overflow-hidden">
    <div class="bg-gradient-to-br from-brand-deep to-brand px-5 py-5 text-center text-white">
      <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">{{ activePreset.name }}</p>
      <p class="mt-1 text-xs text-white/70">Target {{ activePreset.target }}×</p>
      <button
        type="button"
        class="mx-auto mt-4 grid h-40 w-40 place-items-center rounded-full border-4 border-white/20 bg-white/10 transition active:scale-95"
        aria-label="Tambah hitungan dzikir"
        @click="increment"
      >
        <span class="text-5xl font-bold tabular-nums">{{ count }}</span>
      </button>
      <p class="mt-3 text-[11px] text-white/70">Ketuk lingkaran untuk berdzikir</p>
      <div class="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/15">
        <div class="h-full rounded-full bg-gold transition-all duration-300" :style="{ width: pct + '%' }"></div>
      </div>
    </div>
    <div class="flex gap-2 px-4 py-3">
      <button type="button" class="btn-ghost flex-1" @click="reset">Reset</button>
      <button type="button" class="btn-primary flex-1" :disabled="saving" @click="save">{{ saving ? 'Menyimpan…' : 'Simpan ' + count + '×' }}</button>
    </div>
  </section>

  <div class="flex flex-wrap gap-2">
    <button
      v-for="p in presets"
      :key="p.id"
      type="button"
      class="chip"
      :class="{ 'chip-active': p.id === activeId }"
      @click="select(p)"
    >
      {{ p.name }}
    </button>
  </div>

  <section class="space-y-3">
    <article v-for="(d, i) in activePreset.items" :key="i" class="card px-4 py-4">
      <p class="arabic text-xl leading-loose">{{ d.arabic }}</p>
      <p class="mt-2 text-xs italic text-muted">{{ d.latin }}</p>
      <p class="mt-1 text-xs">{{ d.arti }}</p>
      <p class="mt-2 text-[10px] font-semibold uppercase tracking-wide text-brand">{{ d.count }}×</p>
    </article>
  </section>

  <p class="px-1 text-[11px] text-muted">Hitungan tersimpan per hari, bukan per sesi.</p>
</div>
`;

export const tplLaporan = /* html */ `
<div class="space-y-4">
  <section class="card px-4 py-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold">Laporan bulanan</h2>
        <p class="text-[11px] text-muted">{{ reportLoading ? 'Menyiapkan…' : (report ? report.monthLabel : 'Pilih bulan') }}</p>
      </div>
      <input ref="monthEl" class="input !w-40" readonly aria-label="Pilih bulan laporan" />
    </div>

    <div v-if="report" class="mt-3 grid gap-4 sm:grid-cols-[minmax(0,14rem)_1fr]">
      <div>
        <canvas ref="cardEl" width="1080" height="1350" class="w-full max-w-[14rem] rounded-xl border border-line shadow-sm"></canvas>
        <p class="mt-1 text-[10px] text-muted">Pratinjau 1080×1350 — siap untuk WhatsApp/IG Story.</p>

        <div class="mt-2 space-y-2 rounded-xl border border-line px-2.5 py-2 dark:border-[#174438]">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Palet</p>
            <div class="mt-1 flex flex-wrap gap-1">
              <button
                v-for="p in palettes"
                :key="p.key"
                type="button"
                class="flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                :class="p.key === cardStyle.palette ? 'border-brand text-brand' : 'border-line text-muted dark:border-[#174438]'"
                :aria-pressed="p.key === cardStyle.palette"
                @click="setStyle({ palette: p.key })"
              >
                <span class="h-2.5 w-2.5 rounded-full" :style="{ background: p.accentLight }"></span>{{ p.label }}
              </button>
            </div>
          </div>
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Tema</p>
            <div class="mt-1 flex gap-1.5">
              <button type="button" class="chip flex-1 justify-center !px-2 !text-[10px]" :class="{ 'chip-active': cardStyle.theme === 'dark' }" @click="setStyle({ theme: 'dark' })">Gelap</button>
              <button type="button" class="chip flex-1 justify-center !px-2 !text-[10px]" :class="{ 'chip-active': cardStyle.theme === 'light' }" @click="setStyle({ theme: 'light' })">Terang</button>
            </div>
          </div>
          <button type="button" class="flex w-full items-center justify-between text-[10px] font-semibold" @click="setStyle({ showName: !cardStyle.showName })">
            <span>Tampilkan nama</span>
            <span class="material-symbols-rounded !text-[16px]" :class="cardStyle.showName ? 'text-brand' : 'text-muted'">{{ cardStyle.showName ? 'check_circle' : 'radio_button_unchecked' }}</span>
          </button>
        </div>
      </div>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-2 text-center">
          <div class="rounded-xl bg-brand-soft px-3 py-2 dark:bg-[#103328]">
            <p class="text-[10px] uppercase tracking-wide text-muted">Kepatuhan</p>
            <p class="text-lg font-bold text-brand dark:text-[#7fdcc4]">{{ report.prayers.percent }}%</p>
          </div>
          <div class="rounded-xl bg-gold-soft px-3 py-2 dark:bg-[#2a2411]">
            <p class="text-[10px] uppercase tracking-wide text-muted">Streak</p>
            <p class="text-lg font-bold text-[#8a6d10] dark:text-gold">{{ report.streak }} hari</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-primary !min-h-9 !px-3 !text-xs" @click="downloadCard">Unduh PNG</button>
          <button type="button" class="btn-ghost !min-h-9 !px-3 !text-xs" @click="shareCard">Bagikan</button>
          <button type="button" class="btn-ghost !min-h-9 !px-3 !text-xs" @click="copyReport">Salin teks</button>
          <button type="button" class="btn-ghost !min-h-9 !px-3 !text-xs" @click="openWhatsApp">WhatsApp</button>
          <button type="button" class="btn-ghost !min-h-9 !px-3 !text-xs" @click="printReport">
            <span class="material-symbols-rounded !text-[16px]">print</span>
            Cetak/PDF
          </button>
        </div>
        <ul class="space-y-1 text-xs">
          <li class="flex justify-between"><span class="text-muted">Sholat tercatat</span><span class="font-semibold">{{ report.prayers.done }}/{{ report.prayers.total }}</span></li>
          <li class="flex justify-between"><span class="text-muted">Jamaah · Tepat · Qadha</span><span class="font-semibold">{{ report.prayers.jamaah }} · {{ report.prayers.tepat }} · {{ report.prayers.qadha }}</span></li>
          <li class="flex justify-between"><span class="text-muted">Tidak tercatat</span><span class="font-semibold">{{ report.prayers.miss }}</span></li>
          <li class="flex justify-between"><span class="text-muted">Tilawah</span><span class="font-semibold">{{ report.quran.pages }} halaman</span></li>
          <li class="flex justify-between"><span class="text-muted">Dzikir</span><span class="font-semibold">{{ report.dhikr.total }}×</span></li>
          <li v-if="report.weakest" class="flex justify-between"><span class="text-muted">Paling sering terlewat</span><span class="font-semibold">{{ report.weakest }}</span></li>
        </ul>
      </div>
    </div>

    <p v-if="report && report.ramadhan" class="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-[11px] font-semibold text-brand dark:bg-[#103328] dark:text-[#7fdcc4]">
      Rekap Ramadhan: {{ report.ramadhan.tarawihDays }} hari tarawih · {{ report.ramadhan.tadarusPages }} hlm tadarus ·
      {{ fmtRupiah(report.ramadhan.sedekahTotal) }} sedekah
    </p>

    <div v-if="report" class="print-report">
      <h1 style="margin:0 0 4px;font-size:20px">Laporan Ibadah — {{ report.monthLabel }}</h1>
      <p style="margin:0 0 14px;color:#555;font-size:12px">{{ report.hijriLabel }} · {{ report.nama }} · {{ report.cityName }}</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tbody>
          <tr><td style="padding:4px 0;border-bottom:1px solid #ddd">Kepatuhan sholat</td><td style="text-align:right">{{ report.prayers.percent }}% ({{ report.prayers.done }}/{{ report.prayers.total }})</td></tr>
          <tr><td style="padding:4px 0;border-bottom:1px solid #ddd">Jamaah / Tepat / Qadha</td><td style="text-align:right">{{ report.prayers.jamaah }} / {{ report.prayers.tepat }} / {{ report.prayers.qadha }}</td></tr>
          <tr><td style="padding:4px 0;border-bottom:1px solid #ddd">Tilawah</td><td style="text-align:right">{{ report.quran.pages }} halaman</td></tr>
          <tr><td style="padding:4px 0;border-bottom:1px solid #ddd">Dzikir</td><td style="text-align:right">{{ report.dhikr.total }}×</td></tr>
          <tr><td style="padding:4px 0;border-bottom:1px solid #ddd">Streak</td><td style="text-align:right">{{ report.streak }} hari</td></tr>
          <tr v-if="report.ramadhan"><td style="padding:4px 0;border-bottom:1px solid #ddd">Rekap Ramadhan</td><td style="text-align:right">{{ report.ramadhan.tarawihDays }} hari tarawih · {{ report.ramadhan.tadarusPages }} hlm tadarus</td></tr>
        </tbody>
      </table>
      <p style="margin-top:14px;color:#777;font-size:10px">Dibuat dengan IbadahKu — bukan penilaian ibadah.</p>
    </div>
  </section>

  <section class="card px-4 py-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold">Laporan amal</h2>
        <p class="text-[11px] text-muted">{{ rangeLabel }}</p>
      </div>
      <input ref="rangeEl" class="input !w-52" readonly aria-label="Tanggal akhir laporan" />
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="chip" :class="{ 'chip-active': days === 7 }" @click="setDays(7)">7 hari</button>
      <button type="button" class="chip" :class="{ 'chip-active': days === 30 }" @click="setDays(30)">30 hari</button>
      <button type="button" class="chip" :class="{ 'chip-active': days === 90 }" @click="setDays(90)">90 hari</button>
      <button type="button" class="chip" @click="exportCSV">
        <span class="material-symbols-rounded !text-[16px]">download</span>
        Ekspor CSV
      </button>
    </div>
  </section>

  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
    <div class="card px-4 py-3">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Kepatuhan</p>
      <p class="stat-value">{{ stats.percent || 0 }}%</p>
    </div>
    <div class="card px-4 py-3">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Streak</p>
      <p class="stat-value">{{ stats.streak || 0 }}</p>
    </div>
    <div class="card px-4 py-3">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Sholat tercatat</p>
      <p class="stat-value">{{ stats.donePrayers || 0 }}</p>
    </div>
    <div class="card px-4 py-3">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Halaman</p>
      <p class="stat-value">{{ totalPages }}</p>
    </div>
  </div>

  <section class="card px-4 py-4">
    <h3 class="text-sm font-bold">Skor sholat harian</h3>
    <p class="text-[11px] text-muted">0–5 sholat per hari</p>
    <div ref="barEl" class="mt-2 h-60"></div>
  </section>

  <div class="grid gap-3 sm:grid-cols-2">
    <section class="card px-4 py-4">
      <h3 class="text-sm font-bold">Status sholat</h3>
      <div ref="donutEl" class="mt-2 h-56"></div>
    </section>
    <section class="card px-4 py-4">
      <h3 class="text-sm font-bold">Kepatuhan</h3>
      <div ref="radialEl" class="mt-2 h-56"></div>
    </section>
  </div>

  <section class="card px-4 py-4">
    <h3 class="text-sm font-bold">Tilawah per hari</h3>
    <div ref="areaEl" class="mt-2 h-56"></div>
  </section>

  <p class="px-1 text-[11px] text-muted">Ekspor CSV mengikuti bulan dari tanggal akhir yang dipilih.</p>
</div>
`;

export const tplKalender = /* html */ `
<div class="space-y-4">
  <section class="card px-4 py-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold">Kalender hijriah</h2>
        <p class="text-[11px] text-muted">{{ hijriMonthLabel }}</p>
      </div>
      <div class="flex items-center gap-1.5">
        <button type="button" class="btn-ghost !min-h-9 !px-2" aria-label="Bulan sebelumnya" @click="shiftMonth(-1)">
          <span class="material-symbols-rounded !text-[18px]">chevron_left</span>
        </button>
        <input ref="monthEl" class="input !w-36 !min-h-9" readonly aria-label="Pilih bulan kalender" />
        <button type="button" class="btn-ghost !min-h-9 !px-2" aria-label="Bulan berikutnya" @click="shiftMonth(1)">
          <span class="material-symbols-rounded !text-[18px]">chevron_right</span>
        </button>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
      <span v-for="d in weekdays" :key="d">{{ d }}</span>
    </div>
    <div class="mt-1 grid grid-cols-7 gap-1">
      <span v-for="n in leadingBlanks" :key="'blank-' + n"></span>
      <button
        v-for="d in days"
        :key="d.date"
        type="button"
        class="flex flex-col items-center gap-0.5 rounded-lg border border-transparent py-1.5 transition hover:border-line"
        :class="dayClass(d)"
        @click="selected = d"
      >
        <span class="text-xs font-semibold">{{ dayNumber(d.date) }}</span>
        <span class="text-[9px] leading-none text-muted">{{ d.hijri.day }}</span>
        <span class="mt-1 h-1 w-1 rounded-full" :class="dotClass(d)"></span>
      </button>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
      <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-gold"></span> Hari besar</span>
      <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-brand"></span> Puasa sunnah</span>
      <span>Angka kecil = tanggal hijriah</span>
    </div>
  </section>

  <section v-if="selected" class="card px-4 py-4">
    <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Tanggal terpilih</p>
    <p class="mt-1 text-sm font-bold">{{ longDate(selected.date) }}</p>
    <p class="text-xs font-semibold text-brand">{{ selected.hijri.day }} {{ selected.hijri.monthName }} {{ selected.hijri.year }} H</p>
    <p v-if="selected.event" class="mt-2 rounded-lg bg-gold-soft px-3 py-2 text-xs font-semibold text-[#7a5f0e]">{{ selected.event }}</p>
    <p v-if="selected.fasting" class="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-xs font-semibold text-brand dark:bg-[#103328] dark:text-[#7fdcc4]">{{ selected.fasting.label }}</p>
    <p v-if="selected.note" class="mt-2 text-[11px] text-muted">{{ selected.note }}</p>
  </section>

  <section class="card px-4 py-4">
    <h2 class="text-sm font-bold">Hari besar bulan ini</h2>
    <ul class="mt-2 space-y-1 text-xs">
      <li v-for="e in events" :key="e.date" class="flex items-start justify-between gap-2 py-1">
        <span class="font-semibold">{{ e.name }}</span>
        <span class="shrink-0 text-muted">{{ shortDate(e.date) }}</span>
      </li>
      <li v-if="!events.length" class="py-3 text-center text-muted">Tidak ada hari besar pada bulan ini.</li>
    </ul>
  </section>

  <p class="px-1 text-[11px] leading-relaxed text-muted">
    Tanggal hijriah dihitung lokal (akurasi ±1 hari) dan dapat disesuaikan di Pengaturan. Penetapan hari besar
    resmi tetap mengikuti keputusan pemerintah.
  </p>
</div>
`;

export const tplRamadhan = /* html */ `
<div class="space-y-4">
  <section class="card overflow-hidden">
    <div class="bg-gradient-to-br from-brand-deep via-[#0d5145] to-brand px-5 py-5 text-white">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">{{ isRamadhan ? 'Bulan Ramadhan' : 'Menuju Ramadhan' }}</p>
          <p class="truncate text-xl font-bold">{{ headerTitle }}</p>
          <p class="mt-0.5 text-[11px] text-white/70">{{ headerSubtitle }}</p>
        </div>
        <input ref="dateEl" class="input !min-h-9 !w-36 !border-white/25 !bg-white/10 !text-white" readonly aria-label="Pilih tanggal imsakiyah" />
      </div>

      <div v-if="isRamadhan" class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-white/10 px-3 py-2">
          <p class="text-[10px] uppercase tracking-wide text-white/60">Imsak</p>
          <p class="font-mono text-xl font-bold">{{ schedule.imsak }}</p>
          <p class="text-[10px] text-white/70">{{ imsakCountdown }}</p>
        </div>
        <div class="rounded-xl bg-white/10 px-3 py-2">
          <p class="text-[10px] uppercase tracking-wide text-white/60">Berbuka</p>
          <p class="font-mono text-xl font-bold">{{ schedule.maghrib }}</p>
          <p class="text-[10px] text-white/70">{{ berbukaCountdown }}</p>
        </div>
      </div>

      <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div class="h-full rounded-full bg-gold transition-all duration-700" :style="{ width: monthProgress + '%' }"></div>
      </div>
      <p class="mt-1.5 text-[10px] text-white/60">{{ monthProgressLabel }}</p>
    </div>
  </section>

  <section class="card px-4 py-4">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-bold">Imsakiyah</h2>
      <span class="truncate text-[11px] text-muted">{{ cityName }}</span>
    </div>
    <div class="mt-2 divide-y divide-line/70 dark:divide-[#174438]">
      <div v-for="row in scheduleRows" :key="row.key" class="flex items-center justify-between py-2">
        <span class="text-xs font-semibold">{{ row.label }}</span>
        <span class="font-mono text-sm">{{ row.time }}</span>
      </div>
    </div>
    <p class="mt-2 text-[10px] leading-relaxed text-muted">
      Jadwal dari Kemenag (myQuran) plus koreksi menit di Pengaturan. Imsak adalah pengaman, bukan batas akhir makan sahur.
    </p>
  </section>

  <template v-if="isRamadhan">
    <section class="card px-4 py-4">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold">Tarawih</h2>
          <p class="text-[11px] text-muted">Target {{ tarawihTarget }} rakaat</p>
        </div>
        <span class="chip" :class="{ 'chip-active': day.tarawihRakaat >= tarawihTarget }">{{ day.tarawihRakaat }} rakaat</span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="n in [0, 8, 11, 20, 23]"
          :key="'tarawih-' + n"
          type="button"
          class="chip flex-1 justify-center"
          :class="{ 'chip-active': day.tarawihRakaat === n }"
          @click="save({ tarawihRakaat: n })"
        >
          {{ n }}
        </button>
      </div>
      <div class="mt-2 flex gap-2">
        <button type="button" class="btn-ghost flex-1" @click="save({ tarawihRakaat: Math.max(0, day.tarawihRakaat - 2) })">−2 rakaat</button>
        <button type="button" class="btn-ghost flex-1" @click="save({ tarawihRakaat: Math.min(36, day.tarawihRakaat + 2) })">+2 rakaat</button>
      </div>
    </section>

    <section class="card px-4 py-4">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold">Tadarus</h2>
          <p class="text-[11px] text-muted">Target {{ dailyTarget }} hlm/hari · {{ khatamPct }}% khatam</p>
        </div>
        <span class="chip">{{ day.tadarusPages }}/{{ dailyTarget }}</span>
      </div>
      <div class="mt-3 h-2 overflow-hidden rounded-full bg-brand-soft dark:bg-[#103328]">
        <div class="h-full rounded-full bg-brand transition-all duration-500" :style="{ width: tadarusPct + '%' }"></div>
      </div>
      <div class="mt-3 flex items-center gap-2">
        <button type="button" class="btn-ghost !px-3" aria-label="Kurangi satu halaman" @click="save({ tadarusPages: Math.max(0, day.tadarusPages - 1) })">−</button>
        <input
          type="number"
          class="input text-center"
          min="0"
          max="60"
          :value="day.tadarusPages"
          aria-label="Halaman tadarus hari ini"
          @change="save({ tadarusPages: Number($event.target.value) })"
        />
        <button type="button" class="btn-primary flex-1" @click="save({ tadarusPages: Math.min(60, day.tadarusPages + 1) })">+1 halaman</button>
      </div>
      <p class="mt-2 text-[10px] text-muted">Total bulan ini {{ month.tadarusPages }} halaman dari 604 halaman mushaf.</p>
    </section>

    <section class="card px-4 py-4">
      <h2 class="text-sm font-bold">Amalan Ramadhan</h2>
      <div class="mt-3 space-y-2">
        <button type="button" class="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left dark:border-[#174438]" @click="save({ itikaf: !day.itikaf })">
          <span class="text-xs font-semibold">I'tikaf</span>
          <span class="material-symbols-rounded !text-[20px]" :class="day.itikaf ? 'text-brand' : 'text-muted'">{{ day.itikaf ? 'check_circle' : 'radio_button_unchecked' }}</span>
        </button>
        <button type="button" class="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left dark:border-[#174438]" @click="save({ zakatPaid: !day.zakatPaid })">
          <span class="text-xs font-semibold">Zakat fitrah ditunaikan</span>
          <span class="material-symbols-rounded !text-[20px]" :class="day.zakatPaid ? 'text-brand' : 'text-muted'">{{ day.zakatPaid ? 'check_circle' : 'radio_button_unchecked' }}</span>
        </button>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="r-zakat">Nominal zakat fitrah</label>
            <input id="r-zakat" type="number" min="0" class="input" :value="day.zakatAmount" @change="save({ zakatAmount: Number($event.target.value) })" />
          </div>
          <div>
            <label class="label" for="r-sedekah">Sedekah hari ini</label>
            <input id="r-sedekah" type="number" min="0" class="input" :value="day.sedekah" @change="save({ sedekah: Number($event.target.value) })" />
          </div>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="card px-4 py-3">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Hari tarawih</p>
        <p class="stat-value">{{ month.tarawihDays }}</p>
      </div>
      <div class="card px-4 py-3">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Rakaat</p>
        <p class="stat-value">{{ month.tarawihRakaat }}</p>
      </div>
      <div class="card px-4 py-3">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Tadarus</p>
        <p class="stat-value">{{ month.tadarusPages }}<span class="ml-1 text-xs font-semibold text-muted">hlm</span></p>
      </div>
      <div class="card px-4 py-3">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-muted">Sedekah</p>
        <p class="text-sm font-bold">{{ fmtRupiah(month.sedekahTotal) }}</p>
      </div>
    </div>
  </template>

  <section v-else class="card px-4 py-4">
    <h2 class="text-sm font-bold">Ramadhan belum tiba</h2>
    <p class="mt-1 text-xs leading-relaxed text-muted">
      Sekitar <strong>{{ daysTo }}</strong> hari lagi menuju Ramadhan {{ data ? data.year : '' }} H. Imsakiyah di atas tetap bisa
      dilihat untuk tanggal ini. Pilih tanggal pada Ramadhan sebelumnya untuk melihat dan mengisi catatan tarawih &amp; tadarus.
    </p>
  </section>
</div>
`;

export const tplKeluarga = /* html */ `
<div class="space-y-4">
  <section class="card px-4 py-4">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold">Grup keluarga</h2>
        <p class="text-[11px] text-muted">{{ members.length }}/{{ maxMembers }} anggota aktif</p>
      </div>
      <span class="chip max-w-[10rem] truncate">{{ myEmail || 'Akun ini' }}</span>
    </div>
    <div class="mt-3 flex gap-2">
      <input
        v-model="inviteEmail"
        type="email"
        class="input"
        placeholder="email@contoh.com"
        aria-label="Email anggota yang diundang"
        @keyup.enter="invite"
      />
      <button type="button" class="btn-primary !px-4" :disabled="inviting" @click="invite">
        {{ inviting ? 'Mengirim…' : 'Undang' }}
      </button>
    </div>
    <p class="mt-2 text-[10px] leading-relaxed text-muted">
      Anggota harus menerima undangan sebelum ringkasannya bisa dilihat. Mereka dapat mencabut izin kapan saja.
    </p>
  </section>

  <section v-if="incoming.length" class="card px-4 py-4">
    <h2 class="text-sm font-bold">Undangan untuk Anda</h2>
    <ul class="mt-2 space-y-2">
      <li v-for="inv in incoming" :key="inv.id" class="flex items-center gap-2 rounded-xl border border-line px-3 py-2 dark:border-[#174438]">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{{ inv.ownerName }}</p>
          <p class="text-[10px] text-muted">ingin melihat ringkasan ibadah Anda</p>
        </div>
        <button type="button" class="btn-ghost !min-h-8 !px-2 !text-xs" @click="respond(inv.id, false)">Tolak</button>
        <button type="button" class="btn-primary !min-h-8 !px-2 !text-xs" @click="respond(inv.id, true)">Terima</button>
      </li>
    </ul>
  </section>

  <section class="card px-4 py-4">
    <h2 class="text-sm font-bold">Anggota</h2>
    <p v-if="!members.length" class="py-4 text-center text-xs text-muted">
      Belum ada anggota. Undang pasangan atau anak dengan email Google mereka.
    </p>
    <ul v-else class="mt-2 space-y-2">
      <li v-for="m in members" :key="m.id" class="rounded-xl border border-line px-3 py-2.5 dark:border-[#174438]">
        <div class="flex items-center gap-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ m.name }}</p>
            <p class="text-[10px] text-muted">{{ m.email }} · sejak {{ shortDate(m.since) }}</p>
          </div>
          <button type="button" class="btn-quiet" @click="openMember(m)">Ringkasan</button>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <span class="chip !min-h-7 !px-2">{{ m.percent7 }}% 7 hari</span>
          <span class="chip !min-h-7 !px-2">{{ m.streak }} hari streak</span>
          <span class="chip !min-h-7 !px-2">{{ m.quran7 }} hlm tilawah</span>
        </div>
      </li>
    </ul>
  </section>

  <section v-if="outgoing.length" class="card px-4 py-4">
    <h2 class="text-sm font-bold">Undangan terkirim</h2>
    <ul class="mt-2 divide-y divide-line/70 dark:divide-[#174438]">
      <li v-for="o in outgoing" :key="o.id" class="flex items-center justify-between gap-2 py-2 text-xs">
        <span class="truncate">{{ o.email }}</span>
        <button type="button" class="btn-quiet" @click="remove(o.id)">Batalkan</button>
      </li>
    </ul>
  </section>

  <p class="px-1 text-[11px] leading-relaxed text-muted">
    Yang terlihat hanya ringkasan: kepatuhan sholat, streak, tilawah, dan dzikir. Jurnal muhasabah, catatan pribadi,
    serta nominal sedekah/zakat tidak pernah dibagikan.
  </p>

  <div v-if="detail" class="fixed inset-0 z-50 flex items-end justify-center bg-brand-deep/40 sm:items-center sm:p-4" @click.self="detail = null">
    <div class="max-h-[85vh] w-full max-w-md overflow-auto rounded-t-2xl bg-white p-5 dark:bg-[#0c2a23] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="family-detail-title">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 id="family-detail-title" class="truncate text-base font-bold">{{ detail.name }}</h3>
          <p class="text-[11px] text-muted">{{ detail.email }} · sejak {{ shortDate(detail.since) }}</p>
        </div>
        <button type="button" class="btn-quiet" aria-label="Tutup" @click="detail = null">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>

      <p v-if="detailLoading" class="py-6 text-center text-xs text-muted">Memuat ringkasan…</p>
      <template v-else-if="detail.summary">
        <div class="mt-4 grid grid-cols-2 gap-2 text-center">
          <div class="rounded-xl bg-brand-soft px-3 py-2 dark:bg-[#103328]">
            <p class="text-[10px] uppercase tracking-wide text-muted">7 hari</p>
            <p class="text-lg font-bold text-brand dark:text-[#7fdcc4]">{{ detail.summary.percent7 }}%</p>
          </div>
          <div class="rounded-xl bg-gold-soft px-3 py-2 dark:bg-[#2a2411]">
            <p class="text-[10px] uppercase tracking-wide text-muted">30 hari</p>
            <p class="text-lg font-bold text-[#8a6d10] dark:text-gold">{{ detail.summary.percent30 }}%</p>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div class="rounded-lg border border-line px-2 py-2 dark:border-[#174438]">
            <p class="font-semibold">{{ detail.summary.streak }}</p>
            <p class="text-[10px] text-muted">streak</p>
          </div>
          <div class="rounded-lg border border-line px-2 py-2 dark:border-[#174438]">
            <p class="font-semibold">{{ detail.summary.quranPages7 }}</p>
            <p class="text-[10px] text-muted">hlm 7 hari</p>
          </div>
          <div class="rounded-lg border border-line px-2 py-2 dark:border-[#174438]">
            <p class="font-semibold">{{ detail.summary.dhikr7 }}</p>
            <p class="text-[10px] text-muted">dzikir 7 hari</p>
          </div>
        </div>

        <p class="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">14 hari terakhir</p>
        <div class="mt-1 grid grid-cols-7 gap-1.5">
          <div
            v-for="d in detail.summary.heatmap"
            :key="d.date"
            class="flex aspect-square items-center justify-center rounded-md text-[10px] font-bold"
            :class="cellClass(d.score)"
            :title="d.date + ' · ' + d.score + '/5'"
          >
            <span v-if="d.score >= 5">✓</span>
          </div>
        </div>

        <p class="mt-3 text-[10px] text-muted">Terakhir aktif: {{ detail.lastSeen || 'tidak diketahui' }}</p>
        <button type="button" class="btn-ghost mt-3 w-full !text-xs !text-red-600" @click="remove(detail.id)">Cabut akses anggota ini</button>
      </template>
    </div>
  </div>
</div>
`;

export const tplTarget = /* html */ `
<div class="space-y-4">
  <section class="card px-4 py-4">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h2 class="text-sm font-bold">Target bersama</h2>
        <p class="text-[11px] text-muted">
          {{ targets.length }} target · {{ totals.done }}/{{ totals.total }} misi selesai
        </p>
      </div>
      <span class="chip">{{ overall }}%</span>
    </div>
    <div
      class="mt-3 h-2 overflow-hidden rounded-full bg-[#E8EEE9] dark:bg-[#12312a]"
      role="progressbar"
      :aria-valuenow="overall"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Progres seluruh misi"
    >
      <div class="h-full rounded-full bg-brand transition-all" :style="{ width: overall + '%' }"></div>
    </div>
    <p class="mt-2 text-[10px] leading-relaxed text-muted">
      Target dan misi hafalan bisa dicentang anak maupun pendamping. Tanda selesai mencatat siapa yang mencentang dan kapan.
    </p>
  </section>

  <section class="card px-4 py-4">
    <h2 class="text-sm font-bold">Target baru</h2>
    <div class="mt-2">
      <label class="label" for="target-title">Judul target</label>
      <input id="target-title" v-model="form.title" class="input" maxlength="80" placeholder="Hafal QS. Al-Mulk 1–15" />
    </div>
    <div class="mt-2 grid grid-cols-2 gap-3">
      <div>
        <label class="label" for="target-member">Untuk</label>
        <select id="target-member" v-model="form.memberId" class="input">
          <option value="">Saya sendiri</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="target-due">Tenggat</label>
        <input id="target-due" ref="dueEl" v-model="form.dueDate" class="input" placeholder="Opsional" />
      </div>
    </div>
    <div class="mt-3">
      <p class="label">Misi hafalan</p>
      <div class="space-y-2">
        <div v-for="(mission, index) in form.missions" :key="index" class="flex items-center gap-2">
          <input
            v-model="form.missions[index]"
            class="input"
            maxlength="120"
            :placeholder="'Misi ' + (index + 1) + ', mis. Ayat 1–5 lancar'"
            :aria-label="'Misi ke-' + (index + 1)"
          />
          <button
            v-if="form.missions.length > 1"
            type="button"
            class="btn-quiet shrink-0"
            aria-label="Hapus misi"
            @click="removeDraft(index)"
          >
            <span class="material-symbols-rounded !text-[18px]">close</span>
          </button>
        </div>
      </div>
      <button
        type="button"
        class="btn-quiet mt-2 !text-xs"
        :disabled="form.missions.length >= 10"
        @click="addDraft"
      >
        + Tambah misi
      </button>
    </div>
    <button type="button" class="btn-primary mt-3 w-full" :disabled="creating" @click="create">
      {{ creating ? 'Menyimpan…' : 'Buat target' }}
    </button>
  </section>

  <section v-if="!targets.length" class="card px-4 py-8 text-center">
    <span class="material-symbols-rounded !text-[34px] text-muted">checklist</span>
    <p class="mt-1 text-sm font-semibold">Belum ada target</p>
    <p class="mt-1 text-xs text-muted">Buat target pertama, misalnya hafalan satu surat untuk anak.</p>
  </section>

  <article v-for="t in targets" :key="t.id" class="card px-4 py-4">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="text-sm font-bold">{{ t.title }}</h3>
        <p class="text-[11px] text-muted">
          <span class="font-medium">{{ t.forSelf ? 'Untuk diri sendiri' : 'Untuk ' + t.memberName }}</span>
          <span v-if="t.dueDate"> · tenggat {{ shortDate(t.dueDate) }}</span>
        </p>
      </div>
      <span
        class="chip shrink-0"
        :class="t.complete ? '!border-gold/50 !bg-gold-soft !text-[#7a5f0e] dark:!bg-[#2a2411] dark:!text-gold' : ''"
      >
        {{ t.complete ? 'Selesai ✓' : t.percent + '%' }}
      </span>
    </div>

    <div class="mt-2 flex items-center gap-2">
      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E8EEE9] dark:bg-[#12312a]">
        <div
          class="h-full rounded-full"
          :class="t.complete ? 'bg-gold' : 'bg-brand'"
          :style="{ width: t.percent + '%' }"
        ></div>
      </div>
      <span class="text-[10px] tabular-nums text-muted">{{ t.done }}/{{ t.total }} misi</span>
    </div>

    <p v-if="t.note" class="mt-2 text-[11px] italic text-muted">{{ t.note }}</p>

    <ul class="mt-2 space-y-0.5">
      <li v-for="mission in t.missions" :key="mission.id">
        <button
          type="button"
          class="flex w-full items-start gap-2.5 rounded-xl px-1 py-2 text-left transition hover:bg-brand-soft/60 dark:hover:bg-[#103328]"
          :aria-pressed="String(mission.done)"
          @click="toggle(t, mission)"
        >
          <span
            class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition"
            :class="mission.done ? 'border-brand bg-brand text-white' : 'border-line text-transparent dark:border-[#174438]'"
          >
            <span class="material-symbols-rounded !text-[16px]">check</span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[13px] leading-snug" :class="mission.done ? 'text-muted line-through' : 'font-medium'">
              {{ mission.label }}
            </span>
            <span v-if="mission.done" class="mt-0.5 block text-[10px] text-muted">
              Selesai{{ mission.doneBy ? ' oleh ' + mission.doneBy : '' }}{{ mission.doneAt ? ' · ' + shortDate(mission.doneAt) : '' }}
            </span>
          </span>
        </button>
      </li>
    </ul>

    <div class="mt-2 flex items-center gap-2">
      <input
        v-model="t.newMission"
        class="input !min-h-9 !text-xs"
        maxlength="120"
        placeholder="Tambah misi…"
        :aria-label="'Misi baru untuk ' + t.title"
        @keyup.enter="addMission(t)"
      />
      <button type="button" class="btn-quiet shrink-0 !text-xs" @click="addMission(t)">Tambah</button>
      <button
        v-if="t.canRemove"
        type="button"
        class="btn-quiet shrink-0 !text-xs !text-red-600"
        :aria-label="'Hapus target ' + t.title"
        @click="remove(t)"
      >
        Hapus
      </button>
    </div>
  </article>

  <p class="px-1 text-[11px] leading-relaxed text-muted">
    Yang dibagikan hanya judul target, daftar misi, dan status centang. Jurnal muhasabah dan catatan pribadi tetap privat.
  </p>
</div>
`;

export const tplPengaturan = /* html */ `
<div class="space-y-4">
  <p v-if="state.demo" class="rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-xs leading-relaxed text-[#7a5f0e]">
    Mode demo: data tersimpan di browser ini. Hubungkan backend Apps Script agar tersimpan permanen di Google Sheets.
  </p>

  <section class="card space-y-3 px-4 py-4">
    <h2 class="text-sm font-bold">Profil</h2>
    <div>
      <label class="label" for="set-nama">Nama panggilan</label>
      <input id="set-nama" v-model="form.nama" class="input" maxlength="40" />
    </div>
    <div>
      <p class="label">Kota jadwal sholat</p>
      <button type="button" class="btn-ghost w-full justify-between" @click="openCity">
        <span class="truncate">{{ form.cityName || 'Pilih kota' }}</span>
        <span class="material-symbols-rounded !text-[18px]">expand_more</span>
      </button>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label" for="set-offset">Koreksi menit</label>
        <input id="set-offset" v-model.number="form.offsetMenit" type="number" min="-10" max="10" class="input" />
      </div>
      <div>
        <label class="label" for="set-hijri">Koreksi hijriah</label>
        <input id="set-hijri" v-model.number="form.hijriAdj" type="number" min="-2" max="2" class="input" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label" for="set-tilawah">Target tilawah</label>
        <input id="set-tilawah" v-model.number="form.targetTilawah" type="number" min="1" max="60" class="input" />
      </div>
      <div>
        <label class="label" for="set-dzikir">Target dzikir</label>
        <input id="set-dzikir" v-model.number="form.targetDzikir" type="number" min="1" max="999" class="input" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <p class="label">Tema</p>
        <div class="flex gap-2">
          <button type="button" class="chip flex-1 justify-center" :class="{ 'chip-active': form.theme === 'light' }" @click="form.theme = 'light'">Terang</button>
          <button type="button" class="chip flex-1 justify-center" :class="{ 'chip-active': form.theme === 'dark' }" @click="form.theme = 'dark'">Gelap</button>
        </div>
      </div>
      <div>
        <label class="label" for="set-notif">Pengingat</label>
        <select id="set-notif" v-model="form.notifChannel" class="input">
          <option value="calendar">Google Calendar</option>
          <option value="email">Email harian</option>
          <option value="none">Nonaktif</option>
        </select>
      </div>
    </div>
    <button type="button" class="btn-primary w-full" :disabled="saving" @click="save">{{ saving ? 'Menyimpan…' : 'Simpan pengaturan' }}</button>
  </section>

  <section class="card px-4 py-4">
    <h2 class="text-sm font-bold">Kartu laporan</h2>
    <p class="mt-0.5 text-[11px] text-muted">Gaya kartu gambar dan laporan PDF di halaman Laporan.</p>
    <div class="mt-3">
      <p class="label">Palet warna</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="p in palettes"
          :key="p.key"
          type="button"
          class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
          :class="p.key === form.cardPalette ? 'border-brand text-brand' : 'border-line text-muted dark:border-[#174438]'"
          :aria-pressed="p.key === form.cardPalette"
          @click="form.cardPalette = p.key"
        >
          <span class="h-3 w-3 rounded-full" :style="{ background: p.accentLight }"></span>{{ p.label }}
        </button>
      </div>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-3">
      <div>
        <p class="label">Tema kartu</p>
        <div class="flex gap-2">
          <button type="button" class="chip flex-1 justify-center" :class="{ 'chip-active': form.cardTheme === 'dark' }" @click="form.cardTheme = 'dark'">Gelap</button>
          <button type="button" class="chip flex-1 justify-center" :class="{ 'chip-active': form.cardTheme === 'light' }" @click="form.cardTheme = 'light'">Terang</button>
        </div>
      </div>
      <div>
        <p class="label">Nama di kartu</p>
        <button type="button" class="btn-ghost w-full justify-between" @click="form.cardShowName = !form.cardShowName">
          <span>{{ form.cardShowName ? 'Ditampilkan' : 'Disembunyikan' }}</span>
          <span class="material-symbols-rounded !text-[18px]" :class="form.cardShowName ? 'text-brand' : 'text-muted'">{{ form.cardShowName ? 'check_circle' : 'radio_button_unchecked' }}</span>
        </button>
      </div>
    </div>
    <p class="mt-2 text-[10px] text-muted">Berlaku setelah menekan Simpan pengaturan. Pratinjau langsung ada di halaman Laporan.</p>
  </section>

  <section class="card px-4 py-4">
    <h2 class="text-sm font-bold">Tentang</h2>
    <ul class="mt-2 space-y-1 text-xs leading-relaxed text-muted">
      <li>Jadwal sholat: Bimas Islam Kemenag via myQuran API, cadangan Aladhan (metode 20/KEMENAG).</li>
      <li>Al-Qur'an &amp; tafsir: EQuran.id.</li>
      <li>Tanggal hijriah dihitung lokal (akurasi ±1 hari) — gunakan koreksi bila berbeda dengan masjid.</li>
      <li>Data ibadah bersifat pribadi dan tidak dibagikan ke publik.</li>
    </ul>
    <button v-if="state.demo" type="button" class="btn-ghost mt-3 w-full" @click="reset">Muat ulang data demo</button>
  </section>

  <div v-if="showCity" class="fixed inset-0 z-50 flex items-end justify-center bg-brand-deep/40 sm:items-center sm:p-4" @click.self="showCity = false">
    <div class="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-white p-5 dark:bg-[#0c2a23] sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="city-title-2">
      <div class="flex items-center justify-between">
        <h3 id="city-title-2" class="text-base font-bold">Pilih kota</h3>
        <button type="button" class="btn-quiet" aria-label="Tutup" @click="showCity = false">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <input v-model="cityQuery" class="input mt-3" placeholder="Cari kota, mis. Bandung" aria-label="Cari kota" />
      <ul class="mt-2 flex-1 space-y-1 overflow-auto">
        <li v-for="c in filteredCities" :key="c.id">
          <button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-soft dark:hover:bg-[#103328]" @click="pickCity(c)">
            <span class="truncate">{{ c.name }}</span>
            <span v-if="c.id === form.cityId" class="material-symbols-rounded !text-[18px] text-brand">check</span>
          </button>
        </li>
        <li v-if="!filteredCities.length" class="px-3 py-6 text-center text-xs text-muted">Kota tidak ditemukan.</li>
      </ul>
    </div>
  </div>
</div>
`;
