'use client';
import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useFetch } from '@/lib/hooks';
import { Empty, ErrorBox, PageHeader, Spinner } from '@/components/ui';
import { Jadwal, Kelas, Kunjungan } from '@/lib/types';
import { fmtTanggal, namaBulan, pad } from '@/lib/date';

function unduhCsv(rows: Kunjungan[], nama: string) {
  const esc = (s: string | number) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const head = ['Tanggal', 'Jam', 'Kelas', 'Jumlah Siswa', 'Kegiatan', 'Catatan', 'Dicatat Oleh'];
  const lines = [head.map(esc).join(',')].concat(
    [...rows].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map((v) => [v.tanggal, v.jam, v.kelas, v.jumlah_siswa, v.kegiatan, v.catatan, v.dicatat_oleh].map(esc).join(','))
  );
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function RekapPage() {
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(0); // 0 = setahun penuh, 1-12 = bulan tertentu

  const params = useMemo(() => ({ from: `${tahun}-01-01`, to: `${tahun}-12-31` }), [tahun]);
  const kun = useFetch<Kunjungan[]>('listKunjungan', params);
  const jad = useFetch<Jadwal[]>('listJadwal', params);
  const kel = useFetch<Kelas[]>('listKelas', {});

  const prefix = bulan ? `${tahun}-${pad(bulan)}` : String(tahun);
  const kunF = (kun.data || []).filter((v) => v.tanggal.startsWith(prefix));
  const jadF = (jad.data || []).filter((j) => j.tanggal.startsWith(prefix));
  const periode = bulan ? `${namaBulan(bulan - 1)} ${tahun}` : `Tahun ${tahun}`;

  const baris = useMemo(() => (kel.data || []).map((k) => {
    const kv = kunF.filter((v) => v.kelas === k.nama_kelas);
    const jd = jadF.filter((j) => j.kelas === k.nama_kelas);
    const done = jd.filter((j) => kv.some((v) => v.tanggal === j.tanggal)).length;
    return {
      kelas: k.nama_kelas, jadwal: jd.length, terlaksana: done, kunjungan: kv.length,
      siswa: kv.reduce((s, v) => s + v.jumlah_siswa, 0),
      terakhir: kv.reduce((m, v) => (v.tanggal > m ? v.tanggal : m), ''),
    };
  }), [kel.data, kunF, jadF]);

  const total = baris.reduce((t, b) => ({ jadwal: t.jadwal + b.jadwal, terlaksana: t.terlaksana + b.terlaksana, kunjungan: t.kunjungan + b.kunjungan, siswa: t.siswa + b.siswa }), { jadwal: 0, terlaksana: 0, kunjungan: 0, siswa: 0 });
  const perBulan = Array.from({ length: 12 }, (_, i) => (kun.data || []).filter((v) => v.tanggal.startsWith(`${tahun}-${pad(i + 1)}`)).length);
  const maksBulan = Math.max(1, ...perBulan);
  const loading = (kun.loading && !kun.data) || (jad.loading && !jad.data) || (kel.loading && !kel.data);
  const error = kun.error || jad.error || kel.error;

  return (
    <>
      <PageHeader
        title="Rekap kunjungan"
        subtitle={`Periode: ${periode}`}
        actions={
          <>
            <button className="btn-ghost" onClick={() => unduhCsv(kunF, `rekap-kunjungan-perpustakaan-${prefix}.csv`)} disabled={kunF.length === 0}><Download size={16} /> Unduh CSV</button>
            <button className="btn-ghost" onClick={() => window.print()}><Printer size={16} /> Cetak</button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3 print:hidden">
        <select className="input !w-auto" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} aria-label="Tahun">
          {[0, 1, 2].map((i) => <option key={i} value={now.getFullYear() - i}>{now.getFullYear() - i}</option>)}
        </select>
        <select className="input !w-auto" value={bulan} onChange={(e) => setBulan(Number(e.target.value))} aria-label="Bulan">
          <option value={0}>Setahun penuh</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{namaBulan(i)}</option>)}
        </select>
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={() => { kun.reload(); jad.reload(); kel.reload(); }} /></div>}
      {loading ? <Spinner /> : (
        <div className="space-y-6">
          <section className="panel overflow-x-auto">
            <h2 className="h-display border-b border-slate-200 px-5 py-4 text-lg font-bold text-brand-900">Rekap per kelas</h2>
            {baris.length === 0 ? <Empty title="Belum ada data kelas" /> : (
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="bg-brand-50 text-left text-brand-900">
                    <th className="px-5 py-2.5 font-semibold">Kelas</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Jadwal</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Terlaksana</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Kunjungan</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Total siswa</th>
                    <th className="px-5 py-2.5 font-semibold">Kunjungan terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {baris.map((b) => (
                    <tr key={b.kelas}>
                      <td className="px-5 py-2.5 font-semibold text-slate-800">{b.kelas}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{b.jadwal}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{b.terlaksana}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{b.kunjungan}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{b.siswa}</td>
                      <td className="px-5 py-2.5 text-slate-600">{b.terakhir ? fmtTanggal(b.terakhir, false) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-brand-900 font-bold text-brand-900">
                    <td className="px-5 py-2.5">Total</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{total.jadwal}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{total.terlaksana}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{total.kunjungan}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{total.siswa}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
            <p className="px-5 py-3 text-xs text-slate-500">Terlaksana: jadwal yang punya catatan kunjungan pada tanggal dan kelas yang sama.</p>
          </section>

          <section className="panel p-5 print:break-inside-avoid">
            <h2 className="h-display text-lg font-bold text-brand-900">Kunjungan per bulan, {tahun}</h2>
            <div className="mt-5 flex h-44 items-end gap-2" role="img" aria-label={`Grafik jumlah kunjungan per bulan tahun ${tahun}`}>
              {perBulan.map((n, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-bold text-brand-900">{n}</span>
                  <div className={`w-full rounded-t ${bulan === i + 1 ? 'bg-marigold-500' : 'bg-brand-600'}`} style={{ height: `${Math.max(4, (n / maksBulan) * 120)}px`, opacity: n === 0 ? 0.25 : 1 }} />
                  <span className="text-[11px] text-slate-500">{namaBulan(i).slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
