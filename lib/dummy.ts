// Mode Preview: backend tiruan yang menyimpan data di localStorage browser.
// Aturan akses dan validasinya sengaja dibuat sama dengan Code.gs.
import { addDays, parseStr, todayStr } from './date';

type Row = Record<string, any>;
interface DB { users: Row[]; kelas: Row[]; jadwal: Row[]; kunjungan: Row[] }
interface Res { ok: boolean; data?: unknown; error?: string; code?: string }

const KEY = 'perpus_preview_db_v1';
const ROLES = ['admin', 'guru', 'kepsek'];
const MAX_FOTO = 3;

class MockError extends Error {
  code: string;
  constructor(m: string, code = '') { super(m); this.code = code; }
}
function fail(m: string, code = ''): never { throw new MockError(m, code); }
const rid = (p: string) => p + Math.random().toString(36).slice(2, 10);
const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseStr(s).getTime());
const isTime = (s: unknown) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

function seed(): DB {
  const t = todayStr();
  const wali = ['Ibu Sari', 'Bapak Hadi', 'Ibu Lestari', 'Bapak Rahmat', 'Ibu Wulan', 'Bapak Eko'];
  const kelas = wali.map((w, i) => ({ id: 'k' + (i + 1), nama_kelas: 'Kelas ' + (i + 1), wali_kelas: w }));
  const users = [
    { id: 'u1', username: 'admin', password: 'edudigital', nama: 'Pustakawan Sekolah', role: 'admin', kelas: '', aktif: 'ya' },
    { id: 'u2', username: 'guru', password: 'edudigital', nama: 'Ibu Lestari', role: 'guru', kelas: 'Kelas 3', aktif: 'ya' },
    { id: 'u3', username: 'kepsek', password: 'edudigital', nama: 'Kepala Sekolah', role: 'kepsek', kelas: '', aktif: 'ya' },
  ];
  const kegiatan = ['Membaca bersama', 'Meminjam buku', 'Literasi mandiri', 'Mendongeng'];
  const jadwal: Row[] = [];
  const kunjungan: Row[] = [];
  let n = 0;
  for (let o = -28; o <= 21; o++) {
    const d = addDays(t, o);
    const wd = parseStr(d).getDay();
    if (wd === 0 || wd === 6) continue;
    const k = kelas[n % 6].nama_kelas;
    n++;
    jadwal.push({ id: rid('j'), tanggal: d, jam_mulai: '09:00', jam_selesai: '09:45', kelas: k, keterangan: 'Kunjungan rutin', dibuat_oleh: 'admin' });
    if (o < 0 && n % 4 !== 0) {
      kunjungan.push({
        id: rid('v'), tanggal: d, jam: '09:05', kelas: k, jumlah_siswa: 22 + ((n * 3) % 11),
        kegiatan: kegiatan[n % 4], catatan: '', fotos: [], dicatat_oleh: 'admin', created_at: d + 'T02:10:00.000Z',
      });
    }
  }
  return { users, kelas, jadwal, kunjungan };
}

function save(db: DB) {
  try { window.localStorage.setItem(KEY, JSON.stringify(db)); }
  catch { fail('Penyimpanan browser penuh (Mode Preview). Kurangi jumlah foto atau reset data preview.'); }
}
function load(): DB {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* data rusak, buat ulang */ }
  const db = seed();
  save(db);
  return db;
}
export function resetPreview() {
  try { window.localStorage.removeItem(KEY); } catch { /* abaikan */ }
}

const pub = (u: Row) => ({ id: u.id, username: u.username, nama: u.nama, role: u.role, kelas: u.kelas, aktif: u.aktif });
const overlap = (a1: string, a2: string, b1: string, b2: string) => a1 < b2 && b1 < a2;

export async function mockCall(action: string, d: Row, token?: string): Promise<Res> {
  await new Promise((r) => setTimeout(r, 180));
  try { return { ok: true, data: run(action, d || {}, token) }; }
  catch (e: any) { return { ok: false, error: e.message || 'Terjadi kesalahan.', code: e.code || '' }; }
}

function run(action: string, d: Row, token?: string): any {
  const db = load();

  if (action === 'login') {
    const u = db.users.find((x) => x.username === String(d.username || '').trim().toLowerCase());
    if (!u || u.aktif !== 'ya' || u.password !== String(d.password || '')) fail('Username atau password salah.');
    return { token: 'preview-' + u.id, user: { username: u.username, nama: u.nama, role: u.role, kelas: u.kelas } };
  }

  const me = db.users.find((u) => 'preview-' + u.id === token && u.aktif === 'ya');
  if (!me) fail('Sesi berakhir. Silakan login kembali.', 'SESI');
  const need = (...r: string[]) => { if (!r.includes(me.role)) fail('Anda tidak memiliki akses untuk aksi ini.', 'AKSES'); };
  const inRange = (t: string) => (!d.from || t >= d.from) && (!d.to || t <= d.to);
  const kelasAda = (n: string) => db.kelas.some((k) => k.nama_kelas === n);

  switch (action) {
    case 'logout':
      return {};

    case 'listKelas':
      return [...db.kelas].sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas, 'id', { numeric: true }));

    case 'saveKelas': {
      need('admin');
      const nama = String(d.nama_kelas || '').trim();
      if (!nama) fail('Nama kelas wajib diisi.');
      const ex = d.id ? db.kelas.find((k) => k.id === d.id) : undefined;
      if (d.id && !ex) fail('Data kelas tidak ditemukan.');
      if (!ex && db.kelas.some((k) => k.nama_kelas.toLowerCase() === nama.toLowerCase())) fail('Nama kelas sudah ada.');
      if (ex) ex.wali_kelas = String(d.wali_kelas || '').trim();
      else db.kelas.push({ id: rid('k'), nama_kelas: nama, wali_kelas: String(d.wali_kelas || '').trim() });
      save(db);
      return {};
    }
    case 'deleteKelas': {
      need('admin');
      const k = db.kelas.find((x) => x.id === d.id);
      if (!k) fail('Data kelas tidak ditemukan.');
      const dipakai = db.users.some((u) => u.kelas === k.nama_kelas) || db.jadwal.some((j) => j.kelas === k.nama_kelas) || db.kunjungan.some((v) => v.kelas === k.nama_kelas);
      if (dipakai) fail('Kelas masih dipakai oleh akun, jadwal, atau kunjungan sehingga tidak dapat dihapus.');
      db.kelas = db.kelas.filter((x) => x.id !== d.id);
      save(db);
      return {};
    }

    case 'listJadwal': {
      let rows = db.jadwal.filter((j) => inRange(j.tanggal) && (!d.kelas || j.kelas === d.kelas));
      rows = rows.sort((a, b) => (a.tanggal + a.jam_mulai).localeCompare(b.tanggal + b.jam_mulai));
      return d.limit ? rows.slice(0, Number(d.limit)) : rows;
    }
    case 'saveJadwal': {
      need('admin');
      if (!isDate(d.tanggal)) fail('Tanggal tidak valid.');
      if (!isTime(d.jam_mulai) || !isTime(d.jam_selesai)) fail('Jam harus berformat HH:mm.');
      if (d.jam_mulai >= d.jam_selesai) fail('Jam selesai harus lebih besar dari jam mulai.');
      if (!kelasAda(d.kelas)) fail('Kelas tidak ditemukan.');
      const bentrok = db.jadwal.find((j) => j.id !== d.id && j.tanggal === d.tanggal && overlap(j.jam_mulai, j.jam_selesai, d.jam_mulai, d.jam_selesai));
      if (bentrok) fail(`Jadwal bentrok dengan ${bentrok.kelas} (${bentrok.jam_mulai}–${bentrok.jam_selesai}).`);
      const rec = { tanggal: d.tanggal, jam_mulai: d.jam_mulai, jam_selesai: d.jam_selesai, kelas: d.kelas, keterangan: String(d.keterangan || '').trim() };
      const ex = d.id ? db.jadwal.find((j) => j.id === d.id) : undefined;
      if (d.id && !ex) fail('Jadwal tidak ditemukan.');
      if (ex) Object.assign(ex, rec);
      else db.jadwal.push({ id: rid('j'), ...rec, dibuat_oleh: me.username });
      save(db);
      return {};
    }
    case 'deleteJadwal': {
      need('admin');
      if (!db.jadwal.some((j) => j.id === d.id)) fail('Jadwal tidak ditemukan.');
      db.jadwal = db.jadwal.filter((j) => j.id !== d.id);
      save(db);
      return {};
    }

    case 'listKunjungan': {
      let rows = db.kunjungan.filter((v) => inRange(v.tanggal) && (!d.kelas || v.kelas === d.kelas));
      rows = rows.sort((a, b) => (b.tanggal + b.jam).localeCompare(a.tanggal + a.jam));
      return d.limit ? rows.slice(0, Number(d.limit)) : rows;
    }
    case 'saveKunjungan': {
      need('admin', 'guru');
      if (!isDate(d.tanggal)) fail('Tanggal tidak valid.');
      if (d.jam && !isTime(d.jam)) fail('Jam harus berformat HH:mm.');
      if (!kelasAda(d.kelas)) fail('Kelas tidak ditemukan.');
      if (me.role === 'guru' && d.kelas !== me.kelas) fail('Guru hanya dapat mencatat kunjungan untuk kelasnya sendiri.', 'AKSES');
      const jml = Number(d.jumlah_siswa);
      if (!Number.isInteger(jml) || jml < 0 || jml > 500) fail('Jumlah siswa harus berupa angka bulat 0–500.');
      const ex = d.id ? db.kunjungan.find((v) => v.id === d.id) : undefined;
      if (d.id && !ex) fail('Data kunjungan tidak ditemukan.');
      if (ex && me.role === 'guru' && ex.kelas !== me.kelas) fail('Anda tidak dapat mengubah kunjungan kelas lain.', 'AKSES');
      const lama: string[] = (Array.isArray(d.fotoLama) ? d.fotoLama : []).filter((u: string) => ex && ex.fotos.includes(u));
      const baru: string[] = Array.isArray(d.fotoBaru) ? d.fotoBaru : [];
      if (lama.length + baru.length > MAX_FOTO) fail(`Foto maksimal ${MAX_FOTO} per kunjungan.`);
      const rec = {
        tanggal: d.tanggal, jam: d.jam || '', kelas: d.kelas, jumlah_siswa: jml,
        kegiatan: String(d.kegiatan || '').trim(), catatan: String(d.catatan || '').trim(), fotos: [...lama, ...baru],
      };
      if (ex) Object.assign(ex, rec);
      else db.kunjungan.push({ id: rid('v'), ...rec, dicatat_oleh: me.username, created_at: new Date().toISOString() });
      save(db);
      return {};
    }
    case 'deleteKunjungan': {
      need('admin', 'guru');
      const ex = db.kunjungan.find((v) => v.id === d.id);
      if (!ex) fail('Data kunjungan tidak ditemukan.');
      if (me.role === 'guru' && ex.kelas !== me.kelas) fail('Anda tidak dapat menghapus kunjungan kelas lain.', 'AKSES');
      db.kunjungan = db.kunjungan.filter((v) => v.id !== d.id);
      save(db);
      return {};
    }

    case 'listUsers':
      need('admin');
      return db.users.map(pub);
    case 'saveUser': {
      need('admin');
      const username = String(d.username || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) fail('Username 3–30 karakter: huruf kecil, angka, titik, strip, atau garis bawah.');
      const nama = String(d.nama || '').trim();
      if (!nama) fail('Nama wajib diisi.');
      if (!ROLES.includes(d.role)) fail('Role tidak valid.');
      const kelas = d.role === 'guru' ? String(d.kelas || '') : '';
      if (d.role === 'guru' && !kelasAda(kelas)) fail('Guru kelas wajib dipilihkan kelasnya.');
      const aktif = d.aktif === 'tidak' ? 'tidak' : 'ya';
      if (db.users.some((u) => u.id !== d.id && u.username === username)) fail('Username sudah dipakai.');
      const ex = d.id ? db.users.find((u) => u.id === d.id) : undefined;
      if (d.id && !ex) fail('Akun tidak ditemukan.');
      if (!ex && String(d.password || '').length < 6) fail('Password baru minimal 6 karakter.');
      if (d.password && String(d.password).length < 6) fail('Password minimal 6 karakter.');
      if (ex) {
        if (ex.id === me.id && (d.role !== ex.role || aktif !== 'ya')) fail('Anda tidak dapat mengubah role atau menonaktifkan akun sendiri.');
        const adminAktif = db.users.filter((u) => u.role === 'admin' && u.aktif === 'ya').length;
        if (ex.role === 'admin' && (d.role !== 'admin' || aktif !== 'ya') && adminAktif <= 1) fail('Harus ada minimal satu admin aktif.');
        Object.assign(ex, { username, nama, role: d.role, kelas, aktif });
        if (d.password) ex.password = String(d.password);
      } else {
        db.users.push({ id: rid('u'), username, password: String(d.password), nama, role: d.role, kelas, aktif });
      }
      save(db);
      return {};
    }
    case 'deleteUser': {
      need('admin');
      const ex = db.users.find((u) => u.id === d.id);
      if (!ex) fail('Akun tidak ditemukan.');
      if (ex.id === me.id) fail('Anda tidak dapat menghapus akun sendiri.');
      const adminAktif = db.users.filter((u) => u.role === 'admin' && u.aktif === 'ya').length;
      if (ex.role === 'admin' && ex.aktif === 'ya' && adminAktif <= 1) fail('Harus ada minimal satu admin aktif.');
      db.users = db.users.filter((u) => u.id !== d.id);
      save(db);
      return {};
    }
    default:
      fail('Aksi tidak dikenal: ' + action);
  }
}
