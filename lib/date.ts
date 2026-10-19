const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const pad = (n: number) => String(n).padStart(2, '0');
export const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toStr(new Date());
export const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function parseStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function addDays(s: string, n: number): string {
  const d = parseStr(s);
  d.setDate(d.getDate() + n);
  return toStr(d);
}
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export const hariDari = (s: string) => HARI[parseStr(s).getDay()];
export function fmtTanggal(s: string, withDay = true): string {
  if (!s) return '-';
  const d = parseStr(s);
  const core = `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  return withDay ? `${HARI[d.getDay()]}, ${core}` : core;
}
export function fmtBulan(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${BULAN[m - 1]} ${y}`;
}
export const namaBulan = (i: number) => BULAN[i];
export const daysInMonth = (ym: string) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
// Indeks hari pertama dalam bulan, minggu dimulai Senin (0 = Senin)
export const firstWeekday = (ym: string) => (parseStr(ym + '-01').getDay() + 6) % 7;
