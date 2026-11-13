import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
copyFileSync('src/index.html', 'dist/index.html');
if (!existsSync('dist/app.js')) {
  console.error('PERINGATAN: dist/app.js belum ada — jalankan build:js lebih dulu.');
}
console.log('dist/index.html siap');
