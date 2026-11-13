import {
  state,
  api,
  PRAYERS,
  statusMeta,
  nextPrayer,
  formatCountdown,
  todayISO,
  parseISO,
  isoOfDate,
  fmtDate,
  fmtDateShort,
  initFlatpickr,
  renderChart,
  chartBase,
  downloadCSV,
  toast,
  alertError,
  confirmAction,
  applyBootstrap,
  SURAHS,
  SUNNAH_TYPES,
  ramadhanMeta,
  CARD_PALETTES,
  countdownTo,
  fmtRupiah,
  timeToMinutes,
  reactive,
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick
} from './core.js';

import {
  tplDashboard,
  tplSholat,
  tplQuran,
  tplDzikir,
  tplLaporan,
  tplKalender,
  tplRamadhan,
  tplKeluarga,
  tplTarget,
  tplPengaturan
} from './templates.js';
import { drawReportCard } from './card.js';

/* ------------------------------------------------------------------ beranda */
export const DashboardView = {
  template: tplDashboard,
  setup() {
    const clock = ref(new Date());
    let timer = 0;

    onMounted(() => {
      timer = window.setInterval(() => (clock.value = new Date()), 1000);
    });
    onUnmounted(() => window.clearInterval(timer));

    const profile = computed(() => state.profile || {});
    const today = computed(() => state.today || {});
    const marks = computed(() => state.marks || {});
    const stats = computed(() => state.stats || { heatmap: [] });
    const quran = computed(() => state.quran || { todayPages: 0, target: 4 });
    const dhikr = computed(() => state.dhikr || { todayCount: 0, target: 33 });
    const next = computed(() => nextPrayer(today.value.schedule, clock.value));
    const countdown = computed(() => formatCountdown(next.value.secondsLeft));
    const quranPct = computed(() =>
      Math.min(100, Math.round(((quran.value.todayPages || 0) / Math.max(1, quran.value.target || 1)) * 100))
    );
    const last14 = computed(() => (stats.value.heatmap || []).slice(-14));
    const ramadhanBanner = computed(() => {
      const todayValue = state.today;
      if (!todayValue || !todayValue.date) return '';
      const meta = ramadhanMeta(todayValue.date, (state.profile && state.profile.hijriAdj) || 0);
      if (meta.isRamadhan) return `Ramadhan ${meta.hijri.year} H · hari ke-${meta.dayOfRamadhan}`;
      if (!meta.daysToRamadhan) return '';
      return `±${meta.daysToRamadhan} hari menuju Ramadhan ${meta.nextYear} H`;
    });
    const dateLabel = computed(() => fmtDate(today.value.date || todayISO()));

    const modal = ref('');
    const saving = ref(false);
    const surahs = SURAHS;
    const form = reactive({ surah: 'Al-Fatihah', ayahFrom: 1, ayahTo: 7, pages: 1, mode: 'tilawah' });
    const journal = reactive({ syukur: '', muhasabah: '', doa: '' });

    function levelClass(score) {
      if (!score) return 'bg-[#EEF2EF] text-transparent dark:bg-[#12312a]';
      if (score <= 2) return 'bg-brand/25 text-brand';
      if (score <= 4) return 'bg-brand/55 text-white';
      return 'bg-brand text-white';
    }

    async function mark(key) {
      const prayer = PRAYERS.find((p) => p.key === key) || { label: key };
      const time = today.value.schedule ? today.value.schedule[key] : '';
      const current = marks.value[key] || '';
      if (!window.Swal) return;
      const res = await window.Swal.fire({
        title: `${prayer.label} · ${time}`,
        text: 'Bagaimana sholat ini dikerjakan?',
        input: 'radio',
        inputOptions: { jamaah: 'Jamaah', tepat: 'Tepat waktu', qadha: 'Qadha', kosong: 'Hapus catatan' },
        inputValue: current || 'tepat',
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#0E7C66',
        cancelButtonColor: '#94a3b8',
        customClass: { popup: 'rounded-2xl' }
      });
      if (!res.isConfirmed) return;

      const value = res.value === 'kosong' ? '' : res.value;
      try {
        const out = await api('prayer.mark', { date: today.value.date, prayer: key, status: value });
        if (value) state.marks[key] = value;
        else delete state.marks[key];
        if (out && out.streak !== undefined) state.streak = out.streak;
        toast(value ? 'Catatan tersimpan' : 'Catatan dihapus');
      } catch (err) {
        alertError(err);
      }
    }

    function openTilawah() {
      form.pages = Math.max(1, Number(quran.value.target) || 1);
      modal.value = 'tilawah';
    }

    async function saveTilawah() {
      saving.value = true;
      try {
        const out = await api('quran.log', { ...form });
        state.quran = out.summary;
        modal.value = '';
        toast('Tilawah tercatat');
      } catch (err) {
        alertError(err);
      } finally {
        saving.value = false;
      }
    }

    async function openJournal() {
      modal.value = 'journal';
      try {
        const out = await api('journal.get', { date: today.value.date });
        if (out && out.journal) Object.assign(journal, { syukur: '', muhasabah: '', doa: '' }, out.journal);
      } catch (err) {
        /* jurnal kosong bukan error */
      }
    }

    async function saveJournal() {
      saving.value = true;
      try {
        await api('journal.save', { date: today.value.date, ...journal });
        modal.value = '';
        toast('Muhasabah tersimpan');
      } catch (err) {
        alertError(err);
      } finally {
        saving.value = false;
      }
    }

    return {
      state,
      profile,
      today,
      marks,
      stats,
      quran,
      dhikr,
      next,
      countdown,
      quranPct,
      last14,
      ramadhanBanner,
      dateLabel,
      modal,
      saving,
      surahs,
      form,
      journal,
      prayers: PRAYERS,
      statusMeta,
      levelClass,
      mark,
      openTilawah,
      saveTilawah,
      openJournal,
      saveJournal,
      go: navigateSafe
    };
  }
};

/* ------------------------------------------------------------------- sholat */
export const SholatView = {
  template: tplSholat,
  setup() {
    const date = ref(todayISO());
    const dateEl = ref(null);
    const loading = ref(true);
    const month = ref({ days: [], marks: {}, year: 0, month: 0 });
    const showCity = ref(false);
    const cityQuery = ref('');
    const cities = ref([]);

    const profile = computed(() => state.profile || {});
    const prayers = PRAYERS;
    const selectedDate = computed(() => date.value);
    const todayDate = computed(() => (state.today && state.today.date) || todayISO());
    const hijriLabel = computed(() => {
      if (date.value === todayDate.value && state.today && state.today.hijri) return state.today.hijri.label;
      return state.today && state.today.hijri ? state.today.hijri.label : '';
    });
    const monthLabel = computed(() =>
      new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(parseISO(date.value))
    );
    const monthDays = computed(() => month.value.days || []);
    const dayEntry = computed(() => monthDays.value.find((d) => d.date === date.value) || null);
    const dayMarks = computed(() => (month.value.marks && month.value.marks[date.value]) || {});
    const source = computed(() => (state.today && state.today.source) || 'myquran');

    const sunnahTypes = SUNNAH_TYPES;
    const sunnah = ref({ ...(state.sunnah || {}) });
    const qadha = ref((state.qadha || []).slice());
    const sunnahTotal = computed(() => SUNNAH_TYPES.reduce((a, t) => a + (Number(sunnah.value[t.key]) || 0), 0));
    const qadhaTotal = computed(() => qadha.value.reduce((a, q) => a + (Number(q.remaining) || 0), 0));

    const rows = computed(() => {
      const d = dayEntry.value;
      if (!d) return [];
      return [
        { key: 'imsak', label: 'Imsak', icon: 'nightlight', note: 'batas akhir sahur', time: d.imsak },
        { key: 'subuh', label: 'Subuh', icon: 'wb_twilight', note: 'fajar shadiq', time: d.subuh, trackable: true },
        { key: 'syuruq', label: 'Terbit', icon: 'wb_sunny', note: 'akhir waktu subuh', time: d.syuruq },
        { key: 'dhuha', label: 'Dhuha', icon: 'flare', note: 'sholat sunnah', time: d.dhuha },
        { key: 'dzuhur', label: 'Dzuhur', icon: 'light_mode', note: 'zawal matahari', time: d.dzuhur, trackable: true },
        { key: 'ashar', label: 'Ashar', icon: 'wb_sunny', note: 'bayangan sama panjang', time: d.ashar, trackable: true },
        { key: 'maghrib', label: 'Maghrib', icon: 'nights_stay', note: 'terbenam matahari', time: d.maghrib, trackable: true },
        { key: 'isya', label: 'Isya', icon: 'dark_mode', note: 'hilang syafaq', time: d.isya, trackable: true }
      ];
    });

    const filteredCities = computed(() => {
      const q = cityQuery.value.trim().toUpperCase();
      const list = cities.value || [];
      return (q ? list.filter((c) => c.name.toUpperCase().includes(q)) : list).slice(0, 60);
    });

    async function loadMonth() {
      const d = parseISO(date.value);
      loading.value = true;
      try {
        month.value = await api('prayer.month', { year: d.getFullYear(), month: d.getMonth() + 1 });
      } catch (err) {
        alertError(err);
      } finally {
        loading.value = false;
      }
    }

    function dayLabel(iso) {
      const d = parseISO(iso);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    let picker = null;
    onMounted(async () => {
      picker = initFlatpickr(dateEl.value, {
        defaultDate: date.value,
        maxDate: 'today',
        onChange: (selected) => {
          if (!selected || !selected[0]) return;
          const iso = isoOfDate(selected[0]);
          const changedMonth = iso.slice(0, 7) !== date.value.slice(0, 7);
          date.value = iso;
          if (changedMonth) loadMonth();
          loadSunnah();
        }
      });
      await loadMonth();
      await loadSunnah();
    });
    onUnmounted(() => picker && picker.destroy());

    async function setMark(key, value) {
      try {
        const out = await api('prayer.mark', { date: date.value, prayer: key, status: value });
        const marks = { ...(month.value.marks || {}) };
        marks[date.value] = out.marks || {};
        month.value = { ...month.value, marks };
        if (date.value === todayDate.value) {
          state.marks = out.marks || {};
          if (out.streak !== undefined) state.streak = out.streak;
        }
        toast('Tersimpan');
      } catch (err) {
        alertError(err);
      }
    }

    async function loadSunnah() {
      try {
        const out = await api('sunnah.get', { date: date.value });
        sunnah.value = out.counts || {};
        if (date.value === todayDate.value) state.sunnah = sunnah.value;
      } catch (err) {
        alertError(err);
      }
    }

    async function stepSunnah(key, delta) {
      const current = Number(sunnah.value[key]) || 0;
      const next = Math.max(0, Math.min(50, current + delta));
      if (next === current) return;
      try {
        const out = await api('sunnah.mark', { date: date.value, type: key, count: next });
        sunnah.value = out.counts;
        if (date.value === todayDate.value) state.sunnah = out.counts;
      } catch (err) {
        alertError(err);
      }
    }

    async function stepQadha(kind, delta) {
      try {
        const out = await api('qadha.adjust', { kind, delta });
        qadha.value = out.qadha;
        state.qadha = out.qadha;
      } catch (err) {
        alertError(err);
      }
    }

    async function openCity() {
      showCity.value = true;
      cityQuery.value = '';
      if (cities.value.length) return;
      try {
        const out = await api('city.list');
        cities.value = out.cities || [];
      } catch (err) {
        alertError(err);
      }
    }

    async function pickCity(city) {
      try {
        await api('profile.save', { cityId: city.id, cityName: city.name });
        showCity.value = false;
        applyBootstrap(await api('bootstrap'));
        await loadMonth();
        toast(`Kota diubah ke ${city.name}`);
      } catch (err) {
        alertError(err);
      }
    }

    return {
      state,
      date,
      dateEl,
      loading,
      month,
      showCity,
      cityQuery,
      cities,
      profile,
      prayers,
      selectedDate,
      hijriLabel,
      monthLabel,
      monthDays,
      dayEntry,
      dayMarks,
      rows,
      source,
      filteredCities,
      dayLabel,
      setMark,
      openCity,
      pickCity,
      sunnahTypes,
      sunnah,
      qadha,
      sunnahTotal,
      qadhaTotal,
      stepSunnah,
      stepQadha
    };
  }
};

/* -------------------------------------------------------------------- quran */
export const QuranView = {
  template: tplQuran,
  setup() {
    const quran = computed(() => state.quran || { todayPages: 0, target: 4, totalPages: 0, khatamPct: 0 });
    const surahs = ref(SURAHS);
    const logs = ref([]);
    const saving = ref(false);
    const form = reactive({ surah: 'Al-Fatihah', ayahFrom: 1, ayahTo: 0, pages: 1, mode: 'tilawah' });

    const hafalan = ref({ items: [], dueCount: 0, total: 0 });
    const savingHafalan = ref(false);
    const hafalanForm = reactive({ surah: 'Al-Baqarah', ayahFrom: 1, ayahTo: 5, score: 3 });

    const todayPct = computed(() =>
      Math.min(100, Math.round(((quran.value.todayPages || 0) / Math.max(1, quran.value.target || 1)) * 100))
    );

    onMounted(async () => {
      try {
        const [s, l, h] = await Promise.all([api('quran.surahs'), api('quran.logs'), api('hafalan.list')]);
        if (s && s.surahs && s.surahs.length) surahs.value = s.surahs;
        logs.value = (l && l.logs) || [];
        if (h && h.items) hafalan.value = h;
      } catch (err) {
        alertError(err);
      }
    });

    async function save() {
      saving.value = true;
      try {
        const out = await api('quran.log', { ...form });
        state.quran = out.summary;
        logs.value = [out.log, ...logs.value].slice(0, 12);
        form.ayahFrom = 1;
        form.ayahTo = 0;
        toast('Tilawah tercatat');
      } catch (err) {
        alertError(err);
      } finally {
        saving.value = false;
      }
    }

    async function saveHafalan() {
      savingHafalan.value = true;
      try {
        hafalan.value = await api('hafalan.save', { ...hafalanForm });
        state.hafalan = hafalan.value;
        toast('Hafalan ditambahkan');
      } catch (err) {
        alertError(err);
      } finally {
        savingHafalan.value = false;
      }
    }

    async function reviewHafalan(item) {
      if (!window.Swal) return;
      const res = await window.Swal.fire({
        title: `Murojaah ${item.surah}`,
        text: `Ayat ${item.ayahFrom}–${item.ayahTo}. Seberapa lancar?`,
        input: 'select',
        inputOptions: {
          1: '1 · masih terbata',
          2: '2 · perlu diulang',
          3: '3 · cukup lancar',
          4: '4 · lancar',
          5: '5 · sangat lancar'
        },
        inputValue: String(item.score || 3),
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#0E7C66',
        cancelButtonColor: '#94a3b8'
      });
      if (!res.isConfirmed) return;
      try {
        hafalan.value = await api('hafalan.review', { id: item.id, score: Number(res.value) || 3 });
        state.hafalan = hafalan.value;
        toast('Jadwal murojaah diperbarui');
      } catch (err) {
        alertError(err);
      }
    }

    return {
      quran,
      surahs,
      logs,
      saving,
      form,
      todayPct,
      save,
      hafalan,
      hafalanForm,
      savingHafalan,
      saveHafalan,
      reviewHafalan,
      shortDate: fmtDateShort
    };
  }
};

/* ------------------------------------------------------------------- dzikir */
const DZIKIR_PRESETS = [
  {
    id: 'pagi',
    name: 'Dzikir Pagi',
    target: 100,
    items: [
      { arabic: 'أَسْتَغْفِرُ اللَّهَ', latin: 'Astaghfirullah', arti: 'Aku memohon ampun kepada Allah.', count: 100 },
      { arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', latin: 'Subhanallahi wa bihamdih', arti: 'Maha suci Allah dan segala puji bagi-Nya.', count: 100 }
    ]
  },
  {
    id: 'sore',
    name: 'Dzikir Sore',
    target: 33,
    items: [{ arabic: 'سُبْحَانَ اللَّهِ', latin: 'Subhanallah', arti: 'Maha suci Allah.', count: 33 }]
  },
  {
    id: 'setelah-sholat',
    name: 'Setelah Sholat',
    target: 99,
    items: [
      { arabic: 'سُبْحَانَ اللَّهِ', latin: 'Subhanallah', arti: 'Maha suci Allah.', count: 33 },
      { arabic: 'الْحَمْدُ لِلَّهِ', latin: 'Alhamdulillah', arti: 'Segala puji bagi Allah.', count: 33 },
      { arabic: 'اللَّهُ أَكْبَرُ', latin: 'Allahu Akbar', arti: 'Allah Maha Besar.', count: 33 }
    ]
  },
  {
    id: 'tidur',
    name: 'Sebelum Tidur',
    target: 33,
    items: [{ arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَٰهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ', latin: 'Subhanallah walhamdulillah wa la ilaha illallah wallahu akbar', arti: 'Tasbih, tahmid, tahlil, dan takbir.', count: 33 }]
  }
];

export const DzikirView = {
  template: tplDzikir,
  setup() {
    const presets = DZIKIR_PRESETS;
    const activeId = ref(presets[0].id);
    const count = ref(Number((state.dhikr && state.dhikr.todayCount) || 0));
    const saving = ref(false);

    const activePreset = computed(() => presets.find((p) => p.id === activeId.value) || presets[0]);
    const pct = computed(() => Math.min(100, Math.round((count.value / Math.max(1, activePreset.value.target)) * 100)));

    function increment() {
      count.value = Math.min(9999, count.value + 1);
    }

    function select(preset) {
      activeId.value = preset.id;
    }

    async function reset() {
      const ok = await confirmAction({ title: 'Reset hitungan?', text: 'Hitungan dzikir hari ini akan dikembalikan ke 0.', confirm: 'Reset', danger: true });
      if (!ok) return;
      count.value = 0;
      await save(true);
    }

    async function save(silent = false) {
      saving.value = true;
      try {
        const out = await api('dhikr.log', { count: count.value });
        state.dhikr = { todayCount: out.count, target: out.target };
        if (silent !== true) toast(`Dzikir ${out.count}× tersimpan`);
      } catch (err) {
        alertError(err);
      } finally {
        saving.value = false;
      }
    }

    return { presets, activeId, count, saving, activePreset, pct, increment, select, reset, save };
  }
};

/* ------------------------------------------------------------------ laporan */
export const LaporanView = {
  template: tplLaporan,
  setup() {
    const days = ref(30);
    const endDate = ref(todayISO());
    const stats = ref({ heatmap: [], quran: [], composition: { jamaah: 0, tepat: 0, qadha: 0, kosong: 0 }, perPrayer: {} });
    const rangeEl = ref(null);
    const barEl = ref(null);
    const donutEl = ref(null);
    const radialEl = ref(null);
    const areaEl = ref(null);

    let charts = [];
    let picker = null;

    const rangeLabel = computed(() =>
      stats.value && stats.value.from ? `${fmtDate(stats.value.from)} — ${fmtDate(stats.value.to)}` : 'Memuat laporan…'
    );
    const totalPages = computed(() => (stats.value.quran || []).reduce((a, d) => a + Number(d.pages || 0), 0));

    const monthEl = ref(null);
    const cardEl = ref(null);
    const report = ref(null);
    const reportLoading = ref(false);
    const cursor = reactive({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
    const palettes = CARD_PALETTES;
    const cardStyle = reactive({
      palette: (state.profile && state.profile.cardPalette) || 'emerald',
      theme: (state.profile && state.profile.cardTheme) || 'dark',
      showName: state.profile ? state.profile.cardShowName !== false : true
    });
    let monthPicker = null;

    function drawCard() {
      drawReportCard(cardEl.value, report.value, state.profile || {});
    }

    async function loadReport() {
      reportLoading.value = true;
      try {
        report.value = await api('report.month', { year: cursor.year, month: cursor.month });
        await nextTick();
        drawCard();
      } catch (err) {
        alertError(err);
      } finally {
        reportLoading.value = false;
      }
    }

    async function setStyle(patch) {
      Object.assign(cardStyle, patch);
      if (state.profile) {
        state.profile.cardPalette = cardStyle.palette;
        state.profile.cardTheme = cardStyle.theme;
        state.profile.cardShowName = cardStyle.showName;
      }
      drawCard();
      try {
        await api('profile.save', {
          cardPalette: cardStyle.palette,
          cardTheme: cardStyle.theme,
          cardShowName: cardStyle.showName
        });
      } catch (err) {
        /* penyimpanan gaya kartu bersifat opsional */
      }
    }

    function shareText() {
      const r = report.value;
      if (!r) return '';
      const lines = [
        `*Laporan Ibadah — ${r.monthLabel}*`,
        r.hijriLabel || '',
        '',
        `Kepatuhan sholat: ${r.prayers.percent}% (${r.prayers.done}/${r.prayers.total})`,
        `Jamaah ${r.prayers.jamaah} · Tepat ${r.prayers.tepat} · Qadha ${r.prayers.qadha} · Belum ${r.prayers.miss}`,
        `Tilawah: ${r.quran.pages} halaman`,
        `Dzikir: ${r.dhikr.total}×`,
        `Streak: ${r.streak} hari`
      ];
      if (r.ramadhan) {
        lines.push(`Ramadhan: ${r.ramadhan.tarawihDays} hari tarawih · ${r.ramadhan.tadarusPages} hlm tadarus`);
      }
      lines.push('', 'Dicatat dengan IbadahKu');
      return lines.join('\n');
    }

    function downloadCard() {
      const canvas = cardEl.value;
      if (!canvas || typeof canvas.toBlob !== 'function') {
        toast('Perangkat ini tidak mendukung unduh gambar', 'info');
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ibadahku-${report.value.year}-${String(report.value.month).padStart(2, '0')}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Gambar diunduh');
      }, 'image/png');
    }

    function shareCard() {
      const canvas = cardEl.value;
      if (!canvas || typeof canvas.toBlob !== 'function' || !navigator.share) {
        downloadCard();
        return;
      }
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'laporan-ibadah.png', { type: 'image/png' });
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Laporan Ibadah', text: shareText() });
          } else {
            await navigator.share({ title: 'Laporan Ibadah', text: shareText() });
          }
        } catch (err) {
          /* pengguna membatalkan panel berbagi */
        }
      }, 'image/png');
    }

    async function copyReport() {
      const text = shareText();
      try {
        await navigator.clipboard.writeText(text);
        toast('Teks laporan disalin');
      } catch (err) {
        const area = document.createElement('textarea');
        area.value = text;
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand('copy');
          toast('Teks laporan disalin');
        } catch (e) {
          alertError({ message: 'Perangkat tidak mengizinkan penyalinan teks.' });
        }
        area.remove();
      }
    }

    function openWhatsApp() {
      const url = `https://wa.me/?text=${encodeURIComponent(shareText())}`;
      window.open(url, '_blank', 'noopener');
    }

    function printReport() {
      window.print();
    }

    function destroyCharts() {
      charts.forEach((c) => {
        try {
          c && c.destroy();
        } catch (err) {
          /* abaikan */
        }
      });
      charts = [];
    }

    function shortLabel(iso) {
      return fmtDateShort(iso);
    }

    function draw() {
      destroyCharts();
      const s = stats.value;
      if (!s || !s.heatmap) return;
      const dark = document.documentElement.classList.contains('dark');
      const base = chartBase(dark);

      if (barEl.value) {
        charts.push(
          renderChart(barEl.value, {
            ...base,
            chart: { ...base.chart, type: 'bar', height: 240 },
            series: [{ name: 'Sholat', data: (s.heatmap || []).map((d) => ({ x: shortLabel(d.date), y: d.score })) }],
            plotOptions: { bar: { columnWidth: '58%', borderRadius: 4, borderRadiusApplication: 'end' } },
            dataLabels: { enabled: false },
            xaxis: {
              labels: { rotate: -45, style: { fontSize: '9px' } },
              tickAmount: Math.min(12, Math.max(4, Math.round((s.heatmap || []).length / 3)))
            },
            yaxis: { max: 5, tickAmount: 5, labels: { formatter: (v) => Math.round(v) } },
            colors: ['#0E7C66'],
            tooltip: { y: { formatter: (v) => `${v}/5 sholat` } }
          })
        );
      }

      if (donutEl.value) {
        const c = s.composition || {};
        charts.push(
          renderChart(donutEl.value, {
            ...base,
            chart: { ...base.chart, type: 'donut', height: 220 },
            series: [c.jamaah || 0, c.tepat || 0, c.qadha || 0, c.kosong || 0],
            labels: ['Jamaah', 'Tepat waktu', 'Qadha', 'Belum'],
            colors: ['#0E7C66', '#2A9D8F', '#C9A227', dark ? '#33453f' : '#E2E8E5'],
            legend: { position: 'bottom', fontSize: '11px', markers: { size: 5 } },
            dataLabels: { enabled: false },
            stroke: { width: 0 }
          })
        );
      }

      if (radialEl.value) {
        charts.push(
          renderChart(radialEl.value, {
            ...base,
            chart: { ...base.chart, type: 'radialBar', height: 220 },
            series: [Number(s.percent) || 0],
            labels: ['Kepatuhan'],
            plotOptions: {
              radialBar: {
                hollow: { size: '62%' },
                dataLabels: {
                  name: { fontSize: '12px' },
                  value: { fontSize: '26px', fontWeight: 700, formatter: (v) => `${Math.round(v)}%` }
                },
                track: { background: dark ? '#174438' : '#E8F1ED' }
              }
            },
            colors: ['#0E7C66']
          })
        );
      }

      if (areaEl.value) {
        charts.push(
          renderChart(areaEl.value, {
            ...base,
            chart: { ...base.chart, type: 'area', height: 220 },
            series: [{ name: 'Halaman', data: (s.quran || []).map((q) => ({ x: shortLabel(q.date), y: q.pages })) }],
            xaxis: { labels: { rotate: -45, style: { fontSize: '9px' } } },
            yaxis: { labels: { formatter: (v) => Math.round(v) } },
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.45, opacityTo: 0.05 } },
            dataLabels: { enabled: false },
            colors: ['#2A9D8F'],
            noData: { text: 'Belum ada catatan tilawah' }
          })
        );
      }
    }

    async function load() {
      try {
        stats.value = await api('stats.summary', { days: days.value, end: endDate.value });
        await nextTick();
        draw();
      } catch (err) {
        alertError(err);
      }
    }

    function setDays(n) {
      days.value = n;
      load();
    }

    onMounted(async () => {
      picker = initFlatpickr(rangeEl.value, {
        defaultDate: endDate.value,
        maxDate: 'today',
        onChange: (selected) => {
          if (!selected || !selected[0]) return;
          endDate.value = isoOfDate(selected[0]);
          load();
        }
      });
      monthPicker = initFlatpickr(monthEl.value, {
        defaultDate: new Date(cursor.year, cursor.month - 1, 1),
        maxDate: 'today',
        altFormat: 'F Y',
        onChange: async (selected) => {
          if (!selected || !selected[0]) return;
          cursor.year = selected[0].getFullYear();
          cursor.month = selected[0].getMonth() + 1;
          await loadReport();
        }
      });
      await Promise.all([load(), loadReport()]);
      window.addEventListener('resize', draw);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', draw);
      destroyCharts();
      picker && picker.destroy();
      monthPicker && monthPicker.destroy();
    });

    async function exportCSV() {
      try {
        const d = parseISO(endDate.value);
        const out = await api('export.month', { year: d.getFullYear(), month: d.getMonth() + 1 });
        downloadCSV(out.filename, out.csv);
        toast('CSV diunduh');
      } catch (err) {
        alertError(err);
      }
    }

    return {
      days,
      endDate,
      stats,
      rangeEl,
      barEl,
      donutEl,
      radialEl,
      areaEl,
      rangeLabel,
      totalPages,
      setDays,
      exportCSV,
      monthEl,
      cardEl,
      report,
      reportLoading,
      downloadCard,
      shareCard,
      copyReport,
      openWhatsApp,
      printReport,
      palettes,
      cardStyle,
      setStyle,
      fmtRupiah
    };
  }
};

/* ----------------------------------------------------------------- kalender */
export const KalenderView = {
  template: tplKalender,
  setup() {
    const today = todayISO();
    const cursor = reactive({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
    const data = ref({ days: [], events: [] });
    const selected = ref(null);
    const monthEl = ref(null);
    const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    let picker = null;

    const days = computed(() => data.value.days || []);
    const events = computed(() => data.value.events || []);
    const hijriMonthLabel = computed(() => {
      const names = [];
      days.value.forEach((d) => {
        const key = `${d.hijri.monthName} ${d.hijri.year}`;
        if (!names.includes(key)) names.push(key);
      });
      return names.length ? `${names.join(' / ')} H` : '—';
    });
    const leadingBlanks = computed(() => {
      if (!days.value.length) return 0;
      return (parseISO(days.value[0].date).getDay() + 6) % 7;
    });

    const dayNumber = (iso) => Number(iso.slice(8, 10));
    const longDate = (iso) =>
      `${new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parseISO(iso))}, ${fmtDate(iso)}`;

    function dayClass(d) {
      const isSelected = selected.value && selected.value.date === d.date;
      return {
        'border-brand bg-brand-soft dark:bg-[#103328]': isSelected,
        'bg-gold-soft/50 dark:bg-[#173a30]': d.date === today && !isSelected
      };
    }

    function dotClass(d) {
      if (d.event) return 'bg-gold';
      if (d.fasting) return 'bg-brand';
      return 'bg-transparent';
    }

    async function load() {
      try {
        data.value = await api('hijri.month', { year: cursor.year, month: cursor.month });
        const match = days.value.find((d) => d.date === today);
        selected.value = match || days.value[0] || null;
      } catch (err) {
        alertError(err);
      }
    }

    async function shiftMonth(delta) {
      let month = cursor.month + delta;
      let year = cursor.year;
      if (month < 1) {
        month = 12;
        year--;
      }
      if (month > 12) {
        month = 1;
        year++;
      }
      cursor.year = year;
      cursor.month = month;
      if (picker) picker.setDate(new Date(year, month - 1, 1), false);
      await load();
    }

    onMounted(async () => {
      picker = initFlatpickr(monthEl.value, {
        defaultDate: new Date(cursor.year, cursor.month - 1, 1),
        altFormat: 'F Y',
        onChange: async (selectedDates) => {
          if (!selectedDates || !selectedDates[0]) return;
          cursor.year = selectedDates[0].getFullYear();
          cursor.month = selectedDates[0].getMonth() + 1;
          await load();
        }
      });
      await load();
    });
    onUnmounted(() => picker && picker.destroy());

    return {
      state,
      days,
      events,
      selected,
      monthEl,
      weekdays,
      hijriMonthLabel,
      leadingBlanks,
      dayNumber,
      longDate,
      dayClass,
      dotClass,
      shiftMonth,
      shortDate: fmtDateShort
    };
  }
};

/* ---------------------------------------------------------------- ramadhan */
export const RamadhanView = {
  template: tplRamadhan,
  setup() {
    const date = ref(todayISO());
    const dateEl = ref(null);
    const data = ref(null);
    const clock = ref(new Date());
    const saving = ref(false);
    let timer = 0;
    let picker = null;

    onMounted(async () => {
      timer = window.setInterval(() => (clock.value = new Date()), 1000);
      picker = initFlatpickr(dateEl.value, {
        defaultDate: date.value,
        maxDate: 'today',
        onChange: async (selected) => {
          if (!selected || !selected[0]) return;
          date.value = isoOfDate(selected[0]);
          await load();
        }
      });
      await load();
    });
    onUnmounted(() => {
      window.clearInterval(timer);
      picker && picker.destroy();
    });

    const isRamadhan = computed(() => Boolean(data.value && data.value.isRamadhan));
    const hijri = computed(() => (data.value && data.value.hijri) || { day: 0, monthName: '', year: 0 });
    const schedule = computed(() => (data.value && data.value.schedule) || {});
    const day = computed(
      () =>
        (data.value && data.value.day) || {
          tarawihRakaat: 0,
          tadarusPages: 0,
          itikaf: false,
          sedekah: 0,
          zakatPaid: false,
          zakatAmount: 0
        }
    );
    const month = computed(
      () =>
        (data.value && data.value.month) || {
          tarawihDays: 0,
          tarawihRakaat: 0,
          tadarusPages: 0,
          sedekahTotal: 0,
          itikafDays: 0,
          zakatPaid: false
        }
    );
    const dailyTarget = computed(() => (data.value && data.value.dailyTarget) || 21);
    const khatamPct = computed(() => (data.value && data.value.khatamPct) || 0);
    const tarawihTarget = computed(() => (data.value && data.value.tarawihTarget) || 20);
    const cityName = computed(() => (data.value && data.value.cityName) || '');
    const daysTo = computed(() => (data.value && data.value.daysToRamadhan) || 0);

    const headerTitle = computed(() =>
      isRamadhan.value ? `Ramadhan ${hijri.value.year} H` : `Ramadhan ${data.value ? data.value.year : ''} H`
    );
    const headerSubtitle = computed(() => {
      if (!data.value) return '';
      return isRamadhan.value
        ? `Hari ke-${data.value.dayOfRamadhan} dari ${data.value.daysInRamadhan}`
        : `±${data.value.daysToRamadhan} hari lagi`;
    });
    const monthProgress = computed(() =>
      Math.min(100, Math.round((((data.value && data.value.dayOfRamadhan) || 0) / 30) * 100))
    );
    const monthProgressLabel = computed(() =>
      isRamadhan.value
        ? `${data.value.dayOfRamadhan}/30 hari Ramadhan`
        : 'Pilih tanggal pada Ramadhan sebelumnya untuk melihat catatan'
    );

    const scheduleRows = computed(() => [
      { key: 'imsak', label: 'Imsak', time: schedule.value.imsak || '--:--' },
      { key: 'subuh', label: 'Subuh', time: schedule.value.subuh || '--:--' },
      { key: 'syuruq', label: 'Terbit', time: schedule.value.syuruq || '--:--' },
      { key: 'dzuhur', label: 'Dzuhur', time: schedule.value.dzuhur || '--:--' },
      { key: 'ashar', label: 'Ashar', time: schedule.value.ashar || '--:--' },
      { key: 'maghrib', label: 'Maghrib (berbuka)', time: schedule.value.maghrib || '--:--' },
      { key: 'isya', label: 'Isya', time: schedule.value.isya || '--:--' }
    ]);

    const nowSec = (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

    const imsakCountdown = computed(() => {
      if (!schedule.value.imsak || !schedule.value.maghrib) return '—';
      const now = nowSec(clock.value);
      if (now > timeToMinutes(schedule.value.maghrib) * 60) return 'besok';
      if (now > timeToMinutes(schedule.value.imsak) * 60) return 'sudah lewat';
      return `${formatCountdown(countdownTo(schedule.value.imsak, clock.value))} lagi`;
    });

    const berbukaCountdown = computed(() => {
      if (!schedule.value.maghrib) return '—';
      const left = timeToMinutes(schedule.value.maghrib) * 60 - nowSec(clock.value);
      return left > 0 ? `${formatCountdown(left)} lagi` : 'sudah berbuka';
    });

    const tadarusPct = computed(() =>
      Math.min(100, Math.round(((day.value.tadarusPages || 0) / Math.max(1, dailyTarget.value)) * 100))
    );

    async function load() {
      try {
        data.value = await api('ramadhan.day', { date: date.value });
      } catch (err) {
        alertError(err);
      }
    }

    async function save(patch) {
      saving.value = true;
      try {
        data.value = await api('ramadhan.save', { date: date.value, patch });
      } catch (err) {
        alertError(err);
      } finally {
        saving.value = false;
      }
    }

    return {
      date,
      dateEl,
      data,
      saving,
      isRamadhan,
      hijri,
      schedule,
      day,
      month,
      dailyTarget,
      khatamPct,
      tarawihTarget,
      cityName,
      daysTo,
      headerTitle,
      headerSubtitle,
      monthProgress,
      monthProgressLabel,
      scheduleRows,
      imsakCountdown,
      berbukaCountdown,
      tadarusPct,
      save,
      fmtRupiah
    };
  }
};

/* ---------------------------------------------------------------- keluarga */
export const KeluargaView = {
  template: tplKeluarga,
  setup() {
    const family = ref({ members: [], outgoing: [], incoming: [], maxMembers: 5, myEmail: '' });
    const inviteEmail = ref('');
    const inviting = ref(false);
    const detail = ref(null);
    const detailLoading = ref(false);

    const members = computed(() => family.value.members || []);
    const outgoing = computed(() => family.value.outgoing || []);
    const incoming = computed(() => family.value.incoming || []);
    const maxMembers = computed(() => family.value.maxMembers || 5);
    const myEmail = computed(() => family.value.myEmail || '');

    async function load() {
      try {
        family.value = await api('family.list');
      } catch (err) {
        alertError(err);
      }
    }

    async function invite() {
      const email = String(inviteEmail.value || '').trim();
      if (!email) {
        toast('Isi email anggota lebih dulu', 'info');
        return;
      }
      inviting.value = true;
      try {
        family.value = await api('family.invite', { email });
        inviteEmail.value = '';
        toast('Undangan dibuat');
      } catch (err) {
        alertError(err);
      } finally {
        inviting.value = false;
      }
    }

    async function respond(id, accept) {
      try {
        family.value = await api('family.respond', { id, accept });
        toast(accept ? 'Undangan diterima' : 'Undangan ditolak');
      } catch (err) {
        alertError(err);
      }
    }

    async function remove(id) {
      const ok = await confirmAction({
        title: 'Cabut akses?',
        text: 'Ringkasan anggota ini tidak akan bisa dilihat lagi.',
        confirm: 'Cabut',
        danger: true
      });
      if (!ok) return;
      try {
        family.value = await api('family.remove', { id });
        if (detail.value && detail.value.id === id) detail.value = null;
        toast('Akses dicabut');
      } catch (err) {
        alertError(err);
      }
    }

    async function openMember(member) {
      detail.value = { ...member, summary: member.summary || { percent7: 0, percent30: 0, streak: 0, quran7: 0, dhikr7: 0, heatmap: [] } };
      detailLoading.value = true;
      try {
        detail.value = await api('family.member', { id: member.id });
      } catch (err) {
        alertError(err);
        detail.value = null;
      } finally {
        detailLoading.value = false;
      }
    }

    function cellClass(score) {
      if (!score) return 'bg-[#EEF2EF] text-transparent dark:bg-[#12312a]';
      if (score <= 2) return 'bg-brand/25 text-brand';
      if (score <= 4) return 'bg-brand/55 text-white';
      return 'bg-brand text-white';
    }

    onMounted(load);

    return {
      family,
      members,
      outgoing,
      incoming,
      maxMembers,
      myEmail,
      inviteEmail,
      inviting,
      detail,
      detailLoading,
      invite,
      respond,
      remove,
      openMember,
      cellClass,
      shortDate: fmtDateShort
    };
  }
};

/* ------------------------------------------------------------ target bersama */
export const TargetView = {
  template: tplTarget,
  setup() {
    const data = ref({ targets: [], members: [], maxTargets: 12, maxMissions: 20 });
    const form = reactive({ title: '', memberId: '', dueDate: '', missions: [''] });
    const dueEl = ref(null);
    const creating = ref(false);
    let picker = null;

    const targets = computed(() => data.value.targets || []);
    const members = computed(() => data.value.members || []);
    const totals = computed(() => {
      let done = 0;
      let total = 0;
      targets.value.forEach((target) => {
        done += Number(target.done) || 0;
        total += Number(target.total) || 0;
      });
      return { done, total };
    });
    const overall = computed(() =>
      totals.value.total ? Math.round((totals.value.done / totals.value.total) * 100) : 0
    );

    async function load() {
      try {
        data.value = await api('target.list');
      } catch (err) {
        alertError(err);
      }
    }

    function addDraft() {
      if (form.missions.length >= 10) return;
      form.missions.push('');
    }

    function removeDraft(index) {
      form.missions.splice(index, 1);
      if (!form.missions.length) form.missions.push('');
    }

    async function create() {
      const title = String(form.title || '').trim();
      if (title.length < 3) {
        toast('Judul target minimal 3 karakter', 'info');
        return;
      }
      const missions = form.missions.map((value) => String(value || '').trim()).filter(Boolean);
      if (!missions.length) {
        toast('Isi minimal satu misi hafalan', 'info');
        return;
      }
      creating.value = true;
      try {
        data.value = await api('target.create', {
          title,
          memberId: form.memberId || '',
          dueDate: form.dueDate || '',
          missions
        });
        form.title = '';
        form.memberId = '';
        form.dueDate = '';
        form.missions = [''];
        if (picker) picker.clear();
        toast('Target dibuat');
      } catch (err) {
        alertError(err);
      } finally {
        creating.value = false;
      }
    }

    async function toggle(target, mission) {
      try {
        data.value = await api('target.mission.toggle', {
          targetId: target.id,
          missionId: mission.id,
          done: !mission.done
        });
        const updated = targets.value.find((item) => item.id === target.id);
        if (updated && updated.complete) toast('Target tuntas, alhamdulillah');
      } catch (err) {
        alertError(err);
      }
    }

    async function addMission(target) {
      const label = String(target.newMission || '').trim();
      if (!label) return;
      try {
        data.value = await api('target.mission.add', { targetId: target.id, label });
        toast('Misi ditambahkan');
      } catch (err) {
        alertError(err);
      }
    }

    async function remove(target) {
      const ok = await confirmAction({
        title: 'Hapus target?',
        text: 'Target dan seluruh misinya tidak akan tampil lagi.',
        confirm: 'Hapus',
        danger: true
      });
      if (!ok) return;
      try {
        data.value = await api('target.remove', { targetId: target.id });
        toast('Target dihapus');
      } catch (err) {
        alertError(err);
      }
    }

    function shortDate(value) {
      const iso = String(value || '').slice(0, 10);
      return iso ? fmtDateShort(iso) : '';
    }

    onMounted(() => {
      load();
      picker = initFlatpickr(dueEl.value, {
        minDate: 'today',
        onChange: (selected) => {
          form.dueDate = selected.length ? isoOfDate(selected[0]) : '';
        }
      });
    });

    onUnmounted(() => {
      if (picker) picker.destroy();
    });

    return {
      data,
      targets,
      members,
      totals,
      overall,
      form,
      dueEl,
      creating,
      addDraft,
      removeDraft,
      create,
      toggle,
      addMission,
      remove,
      shortDate
    };
  }
};

/* --------------------------------------------------------------- pengaturan */
export const PengaturanView = {
  template: tplPengaturan,
  setup() {
    const DEFAULTS = {
      nama: '',
      cardPalette: 'emerald',
      cardTheme: 'dark',
      cardShowName: true,
      cityId: '1301',
      cityName: '',
      offsetMenit: 0,
      hijriAdj: 0,
      targetTilawah: 4,
      targetDzikir: 33,
      theme: 'light',
      notifChannel: 'calendar'
    };
    const form = reactive({ ...DEFAULTS, ...(state.profile || {}) });
    const showCity = ref(false);
    const cityQuery = ref('');
    const cities = ref([]);
    const saving = ref(false);

    const filteredCities = computed(() => {
      const q = cityQuery.value.trim().toUpperCase();
      const list = cities.value || [];
      return (q ? list.filter((c) => c.name.toUpperCase().includes(q)) : list).slice(0, 60);
    });

    async function openCity() {
      showCity.value = true;
      cityQuery.value = '';
      if (cities.value.length) return;
      try {
        const out = await api('city.list');
        cities.value = out.cities || [];
      } catch (err) {
        alertError(err);
      }
    }

    function pickCity(city) {
      form.cityId = city.id;
      form.cityName = city.name;
      showCity.value = false;
    }

    async function save() {
      saving.value = true;
      try {
        const out = await api('profile.save', { ...form });
        state.profile = out.profile;
        applyThemeSafe(out.profile.theme);
        applyBootstrap(await api('bootstrap'));
        toast('Pengaturan disimpan');
      } catch (err) {
        alertError(err);
      } finally {
        saving.value = false;
      }
    }

    async function reset() {
      const ok = await confirmAction({
        title: 'Muat ulang data demo?',
        text: 'Semua catatan demo di browser ini akan dihapus dan dibuat ulang.',
        confirm: 'Muat ulang',
        danger: true
      });
      if (!ok) return;
      try {
        await api('reset.demo');
        window.location.reload();
      } catch (err) {
        alertError(err);
      }
    }

    return { state, form, showCity, cityQuery, cities, saving, filteredCities, openCity, pickCity, save, reset, palettes: CARD_PALETTES };
  }
};

/* helper lokal (menghindari import melingkar pada template) */
function navigateSafe(name) {
  if (window.location.hash !== `#/${name}`) window.location.hash = `#/${name}`;
}

function applyThemeSafe(mode) {
  const dark = mode === 'dark';
  document.documentElement.classList.toggle('dark', dark);
}
