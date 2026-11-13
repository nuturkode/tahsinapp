import { state, busy, api, applyBootstrap, applyTheme, initRouter } from './core.js';
import { tplRoot } from './templates.js';
import { TopBar, BottomNav, SideNav } from './components.js';
import {
  DashboardView,
  SholatView,
  QuranView,
  DzikirView,
  LaporanView,
  KalenderView,
  RamadhanView,
  KeluargaView,
  TargetView,
  PengaturanView
} from './views.js';

function mount() {
  const { createApp } = window.Vue;
  const app = createApp({
    template: tplRoot,
    setup() {
      return { state, busy };
    }
  });

  app.component('top-bar', TopBar);
  app.component('bottom-nav', BottomNav);
  app.component('side-nav', SideNav);
  app.component('dashboard-view', DashboardView);
  app.component('sholat-view', SholatView);
  app.component('quran-view', QuranView);
  app.component('dzikir-view', DzikirView);
  app.component('laporan-view', LaporanView);
  app.component('kalender-view', KalenderView);
  app.component('ramadhan-view', RamadhanView);
  app.component('keluarga-view', KeluargaView);
  app.component('target-view', TargetView);
  app.component('pengaturan-view', PengaturanView);

  app.mount('#app');
  const boot = document.getElementById('boot');
  if (boot) boot.remove();
}

(async function main() {
  if (!window.Vue) {
    const el = document.getElementById('app') || document.body;
    el.innerHTML = '<p style="padding:24px;font:14px sans-serif">Vue tidak dapat dimuat. Periksa koneksi ke CDN.</p>';
    return;
  }

  initRouter();

  try {
    const data = await api('bootstrap');
    applyBootstrap(data);
    applyTheme((data.profile && data.profile.theme) || 'light');
  } catch (err) {
    state.error = (err && err.message) || 'Gagal memuat data awal. Coba muat ulang halaman.';
    applyTheme('light');
  }

  mount();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => document.documentElement.classList.add('fonts-ready'));
  }
})();
