import { state, navigate, computed, ref, applyTheme, api } from './core.js';
import { tplTopBar, tplBottomNav, tplSideNav } from './templates.js';

export const NAV_PRIMARY = [
  { route: 'beranda', label: 'Beranda', icon: 'home' },
  { route: 'sholat', label: 'Sholat', icon: 'mosque' },
  { route: 'quran', label: "Al-Qur'an", icon: 'menu_book' },
  { route: 'dzikir', label: 'Dzikir', icon: 'self_improvement' },
  { route: 'laporan', label: 'Laporan', icon: 'insights' }
];

export const NAV_ALL = [
  ...NAV_PRIMARY,
  { route: 'kalender', label: 'Kalender', icon: 'calendar_month' },
  { route: 'ramadhan', label: 'Ramadhan', icon: 'nightlight' },
  { route: 'keluarga', label: 'Keluarga', icon: 'groups' },
  { route: 'target', label: 'Target', icon: 'checklist' }
];

const TITLES = {
  beranda: 'Beranda',
  sholat: 'Jadwal Sholat',
  quran: "Al-Qur'an",
  dzikir: 'Dzikir & Tasbih',
  laporan: 'Laporan Amal',
  kalender: 'Kalender Hijriah',
  ramadhan: 'Mode Ramadhan',
  keluarga: 'Grup Keluarga',
  target: 'Target Bersama',
  pengaturan: 'Pengaturan'
};

export const TopBar = {
  template: tplTopBar,
  setup() {
    const dark = ref(document.documentElement.classList.contains('dark'));
    const title = computed(() => TITLES[state.route] || 'IbadahKu');
    const hijri = computed(() => (state.today && state.today.hijri ? state.today.hijri.label : ''));

    async function toggle() {
      dark.value = !dark.value;
      const theme = dark.value ? 'dark' : 'light';
      applyTheme(theme);
      if (state.profile) {
        state.profile.theme = theme;
        try {
          await api('profile.save', { theme });
        } catch (err) {
          /* penyimpanan tema bersifat opsional */
        }
      }
    }

    return { state, title, hijri, dark, toggle, go: navigate };
  }
};

export const BottomNav = {
  template: tplBottomNav,
  setup() {
    return { items: NAV_PRIMARY, state, go: navigate };
  }
};

export const SideNav = {
  template: tplSideNav,
  setup() {
    return { items: NAV_ALL, state, go: navigate };
  }
};
