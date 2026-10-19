export type Role = 'admin' | 'guru' | 'kepsek';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin / Pustakawan',
  guru: 'Guru Kelas',
  kepsek: 'Kepala Sekolah',
};

export interface SessionUser { username: string; nama: string; role: Role; kelas: string }
export interface Session { token: string; user: SessionUser }

export interface User { id: string; username: string; nama: string; role: Role; kelas: string; aktif: string }
export interface Kelas { id: string; nama_kelas: string; wali_kelas: string }
export interface Jadwal {
  id: string; tanggal: string; jam_mulai: string; jam_selesai: string;
  kelas: string; keterangan: string; dibuat_oleh: string;
}
export interface Kunjungan {
  id: string; tanggal: string; jam: string; kelas: string; jumlah_siswa: number;
  kegiatan: string; catatan: string; fotos: string[]; dicatat_oleh: string; created_at: string;
}
