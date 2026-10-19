'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { NotebookPen } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useFetch } from '@/lib/hooks';
import { Badge, Empty, ErrorBox, PageHeader, Spinner } from '@/components/ui';
import { Jadwal, Kelas, Kunjungan } from '@/lib/types';
import { addDays, fmtBulan, fmtTanggal, todayStr } from '@/lib/date';

const SPINE = ['#1f5d72', '#e9a30f', '#b5483a', '#3f7d58', '#6d5a9c', '#c9702b', '#4a93a8', '#8a6d3b'];

export default function DashboardPage() {
  const { session } = useAuth();
  const user = session!.user;
  const today = todayStr();
  const ym = today.slice(0, 7);

  const jadwal = useFetch<Jadwal[]>('listJadwal', { from: today, to: addDays(today, 30) });
  const bulanIni = useFetch<Kunjungan[]>('listKunjungan', { from: ym + '-01', to: ym + '-31' });
  const kelas = useFetch<Kelas[]>('listKelas', {});

  const stats = useMemo(() => {
    const rows = bulanIni.data || [];
    const perKelas: Record<string, number> = {};
    rows.forEach((v) => { perKelas[v.kelas] = (perKelas[v.kelas] || 0) + 1; });
    return {
      kunjungan: rows.length,
      siswa: rows.reduce((s, v) => s + v.jumlah_siswa, 0),
      kelasAktif: Object.keys(perKelas).length,
      perKelas,
      terbaru: rows.slice(0, 5),
    };
  }, [bulanIni.data]);

  const hariIni = (jadwal.data || []).filter((j) => j.tanggal === today);
  const mendatang = (jadwal.data || []).filter((j) => j.tanggal > today).slice(0, 5);
  const daftarKelas = kelas.data || [];
  const maks = Math.max(1, ...daftarKelas.map((k) => stats.perKelas[k.nama_kelas] || 0));
  const bisaCatat = user.role === 'admin' || user.role === 'guru';
  const loading = jadwal.loading || bulanIni.loading || kelas.loading;
  const error = jadwal.error || bulanIni.error || kelas.error;

  return (
    <>
      <PageHeader
        title={`Halo, ${user.nama.split(' ')[0]}`}
        subtitle={`Ringkasan perpustakaan bulan ${fmtBulan(ym)}`}
        actions={bisaCatat && <Link href="/kunjungan?new=1" className="btn-accent"><NotebookPen size={16} /> Catat kunjungan</Link>}
      />
      {error && <div className="mb-4"><ErrorBox message={error} onRetry={() => { jadwal.reload(); bulanIni.reload(); kelas.reload(); }} /></div>}
      {loading && !bulanIni.data ? <Spinner /> : (
        <div className="space-y-6">
          <section className="panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="h-display text-lg font-bold text-brand-900">Rak kunjungan bulan ini</h2>
                <p className="text-sm text-slate-600">Tinggi buku menunjukkan jumlah kunjungan tiap kelas.</p>
              </div>
              <p className="text-sm text-slate-600">
                <b className="text-brand-900">{stats.kunjungan}</b> kunjungan · <b className="text-brand-900">{stats.siswa}</b> siswa · <b className="text-brand-900">{stats.kelasAktif}</b> kelas
              </p>
            </div>
            {daftarKelas.length === 0 ? <Empty title="Belum ada data kelas" hint="Admin dapat menambah kelas di menu Pengguna." /> : (
              <div className="mt-6 overflow-x-auto">
                <div className="flex min-w-max items-end gap-3 px-1">
                  {daftarKelas.map((k, i) => {
                    const n = stats.perKelas[k.nama_kelas] || 0;
                    const h = 24 + Math.round((n / maks) * 120);
                    return (
                      <div key={k.id} className="flex w-16 flex-col items-center">
                        <span className="mb-1 text-sm font-bold text-brand-900">{n}</span>
                        <div className="flex w-full items-start justify-center rounded-t-md pt-2 text-[10px] font-bold text-white/90"
                          style={{ height: h, background: SPINE[i % SPINE.length], opacity: n === 0 ? 0.35 : 1 }}>
                          <span style={{ writingMode: 'vertical-rl' }}>{k.nama_kelas}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="h-1.5 rounded-full bg-brand-900" aria-hidden />
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="panel">
              <h2 className="h-display border-b border-slate-200 px-5 py-4 text-lg font-bold text-brand-900">Jadwal hari ini dan mendatang</h2>
              {hariIni.length + mendatang.length === 0 ? (
                <Empty title="Tidak ada jadwal dalam 30 hari ke depan" hint="Admin dapat menambah jadwal di menu Jadwal." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {[...hariIni, ...mendatang].map((j) => (
                    <li key={j.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="font-semibold text-slate-800">{j.kelas}</p>
                        <p className="text-sm text-slate-600">{fmtTanggal(j.tanggal)} · {j.jam_mulai}–{j.jam_selesai}</p>
                      </div>
                      {j.tanggal === today ? <Badge tone="amber">Hari ini</Badge> : <Badge tone="blue">Akan datang</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="h-display text-lg font-bold text-brand-900">Kunjungan terbaru</h2>
                <Link href="/kunjungan" className="text-sm font-semibold text-brand-700 hover:underline">Lihat semua</Link>
              </div>
              {stats.terbaru.length === 0 ? (
                <Empty title="Belum ada kunjungan bulan ini" hint="Catat kunjungan pertama dari tombol di atas." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {stats.terbaru.map((v) => (
                    <li key={v.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-800">{v.kelas}</p>
                        <span className="text-sm text-slate-600">{v.jumlah_siswa} siswa</span>
                      </div>
                      <p className="text-sm text-slate-600">{fmtTanggal(v.tanggal)}{v.kegiatan ? ` · ${v.kegiatan}` : ''}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
