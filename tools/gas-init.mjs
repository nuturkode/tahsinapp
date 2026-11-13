/**
 * Menulis .clasp.json untuk proyek Apps Script yang sudah dibuat.
 *
 * Pakai bila proyek dibuat dari editor (bukan `clasp create`):
 *   1. Buka https://script.google.com → New project
 *   2. Project Settings → IDs → Script ID
 *   3. npm run gas:init -- <SCRIPT_ID>
 *
 * .clasp.json berisi scriptId pribadi dan sudah ada di .gitignore.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const raw = String(process.argv[2] || process.env.SCRIPT_ID || '').trim();

if (!raw) {
  console.error(
    [
      'Script ID belum diisi.',
      '',
      '  npm run gas:init -- <SCRIPT_ID>',
      '',
      'Ambil Script ID dari editor Apps Script: Project Settings → IDs → Script ID.',
      'Atau buat proyek baru sekalian dengan: npm run gas:create'
    ].join('\n')
  );
  process.exit(1);
}

if (!/^[A-Za-z0-9_-]{20,}$/.test(raw)) {
  console.error(`Script ID tidak valid: "${raw}". Panjangnya ± 50 karakter alfanumerik (boleh mengandung - dan _).`);
  process.exit(1);
}

if (!existsSync('appsscript.json')) {
  console.error('appsscript.json tidak ditemukan. Jalankan perintah ini dari akar proyek.');
  process.exit(1);
}

if (existsSync('.clasp.json')) {
  try {
    const current = JSON.parse(readFileSync('.clasp.json', 'utf8'));
    if (current.scriptId && current.scriptId !== raw) {
      console.log(`Catatan: menimpa .clasp.json lama (scriptId ${current.scriptId.slice(0, 8)}…).`);
    }
  } catch {
    console.log('Catatan: .clasp.json lama tidak terbaca, akan ditimpa.');
  }
}

writeFileSync('.clasp.json', `${JSON.stringify({ scriptId: raw, rootDir: '.' }, null, 2)}\n`);
console.log('.clasp.json dibuat · rootDir "."');
console.log('Lanjut: npm run gas:login (sekali) lalu npm run gas:push');
