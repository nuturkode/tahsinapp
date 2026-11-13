/**
 * Menggambar kartu laporan 1080×1350 ke <canvas>.
 * Dipisah dari view agar bisa dipakai ulang dan mudah diuji.
 */
import { CARD_PALETTES } from './core.js';

function roundRect(ctx, x, y, w, h, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function drawReportCard(canvas, report, profile = {}) {
  try {
    if (!canvas || typeof canvas.getContext !== 'function' || !report) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = CARD_PALETTES.find((p) => p.key === profile.cardPalette) || CARD_PALETTES[0];
    const dark = (profile.cardTheme || 'dark') !== 'light';
    const stops = dark ? palette.dark : palette.light;
    const accent = dark ? palette.accentDark : palette.accentLight;
    const textColor = dark ? '#ffffff' : '#14201c';
    const muted = dark ? 'rgba(255,255,255,0.62)' : 'rgba(20,32,28,0.55)';
    const track = dark ? 'rgba(255,255,255,0.16)' : 'rgba(20,32,28,0.12)';
    const showName = profile.cardShowName !== false;
    const font = '"Plus Jakarta Sans", sans-serif';

    const W = canvas.width;
    const H = canvas.height;
    const pad = 72;

    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, stops[0]);
    gradient.addColorStop(0.55, stops[1]);
    gradient.addColorStop(1, stops[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = dark ? 0.08 : 0.07;
    ctx.fillStyle = dark ? '#ffffff' : accent;
    ctx.beginPath();
    ctx.arc(W - 90, 110, 230, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(60, H - 60, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = `600 26px ${font}`;
    ctx.fillText('LAPORAN IBADAH', pad, 120);

    ctx.fillStyle = textColor;
    ctx.font = `bold 62px ${font}`;
    ctx.fillText(report.monthLabel, pad, 196);

    ctx.fillStyle = muted;
    ctx.font = `400 26px ${font}`;
    ctx.fillText(report.hijriLabel || '', pad, 238);

    if (showName && report.nama) {
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.92;
      ctx.font = `500 28px ${font}`;
      ctx.fillText(report.nama, pad, 292);
      ctx.globalAlpha = 1;
    }

    const cx = W / 2;
    const cy = 530;
    const radius = 150;
    ctx.lineWidth = 26;
    ctx.strokeStyle = track;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (report.prayers.percent / 100));
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.font = `bold 82px ${font}`;
    ctx.fillText(`${report.prayers.percent}%`, cx, cy + 22);
    ctx.fillStyle = muted;
    ctx.font = `500 24px ${font}`;
    ctx.fillText('kepatuhan sholat', cx, cy + 68);
    ctx.textAlign = 'left';

    const stats = [
      ['Sholat tercatat', `${report.prayers.done}/${report.prayers.total}`],
      ['Jamaah', String(report.prayers.jamaah)],
      ['Tepat waktu', String(report.prayers.tepat)],
      ['Qadha', String(report.prayers.qadha)],
      ['Tilawah', `${report.quran.pages} hlm`],
      ['Dzikir', `${report.dhikr.total}×`],
      ['Streak', `${report.streak} hari`],
      ['Surat dihafal', String(report.hafalan.total)]
    ];
    const colWidth = (W - pad * 2) / 2;
    stats.forEach((item, i) => {
      const x = pad + (i % 2) * colWidth;
      const y = 780 + Math.floor(i / 2) * 92;
      ctx.fillStyle = muted;
      ctx.font = `400 22px ${font}`;
      ctx.fillText(item[0], x, y);
      ctx.fillStyle = textColor;
      ctx.font = `600 34px ${font}`;
      ctx.fillText(item[1], x, y + 36);
    });

    const barY = 1180;
    ctx.fillStyle = muted;
    ctx.font = `400 22px ${font}`;
    ctx.fillText('Sholat per waktu', pad, barY - 24);

    const gap = 18;
    const barW = (W - pad * 2 - gap * 4) / 5;
    const barH = 70;
    (report.perPrayer || []).forEach((p, i) => {
      const x = pad + i * (barW + gap);
      ctx.fillStyle = track;
      roundRect(ctx, x, barY, barW, barH, 10);
      ctx.fill();

      const fillH = Math.max(4, (p.percent / 100) * barH);
      ctx.fillStyle = accent;
      roundRect(ctx, x, barY + (barH - fillH), barW, fillH, 10);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.fillStyle = muted;
      ctx.font = `500 18px ${font}`;
      ctx.fillText(p.label, x + barW / 2, barY + barH + 26);
      ctx.fillStyle = textColor;
      ctx.font = `600 20px ${font}`;
      ctx.fillText(`${p.percent}%`, x + barW / 2, barY + barH + 52);
      ctx.textAlign = 'left';
    });

    ctx.fillStyle = muted;
    ctx.font = `400 20px ${font}`;
    ctx.fillText('IbadahKu · laporan dibuat otomatis, bukan penilaian ibadah', pad, H - 56);
  } catch (err) {
    /* canvas tidak tersedia (mis. saat uji DOM) */
  }
}
