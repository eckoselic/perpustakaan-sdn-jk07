'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { callApi } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, useToast } from '@/components/ui';
import { Jadwal, Kelas, Kunjungan } from '@/lib/types';
import { addMonths, daysInMonth, firstWeekday, fmtBulan, fmtTanggal, pad, todayStr } from '@/lib/date';

type Form = { id?: string; tanggal: string; jam_mulai: string; jam_selesai: string; kelas: string; keterangan: string };

export default function JadwalPage() {
  const { session } = useAuth();
  const user = session!.user;
  const toast = useToast();
  const router = useRouter();
  const today = todayStr();
  const isAdmin = user.role === 'admin';

  const [ym, setYm] = useState(today.slice(0, 7));
  const [kelasF, setKelasF] = useState('');
  const [day, setDay] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const params = useMemo(() => ({ from: ym + '-01', to: ym + '-31' }), [ym]);
  const jad = useFetch<Jadwal[]>('listJadwal', params);
  const kun = useFetch<Kunjungan[]>('listKunjungan', params);
  const kel = useFetch<Kelas[]>('listKelas', {});
  const daftarKelas = kel.data || [];

  const semua = (jad.data || []).filter((j) => !kelasF || j.kelas === kelasF);
  const tampil = semua.filter((j) => !day || j.tanggal === day);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    semua.forEach((j) => { m[j.tanggal] = (m[j.tanggal] || 0) + 1; });
    return m;
  }, [semua]);

  const grouped = useMemo(() => {
    const g: Record<string, Jadwal[]> = {};
    tampil.forEach((j) => { (g[j.tanggal] = g[j.tanggal] || []).push(j); });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [tampil]);

  const terlaksana = (j: Jadwal) => (kun.data || []).some((k) => k.tanggal === j.tanggal && k.kelas === j.kelas);
  const bisaCatat = (j: Jadwal) => (isAdmin || (user.role === 'guru' && j.kelas === user.kelas)) && j.tanggal <= today && !terlaksana(j);

  function status(j: Jadwal) {
    if (terlaksana(j)) return <Badge tone="green">Terlaksana</Badge>;
    if (j.tanggal === today) return <Badge tone="amber">Hari ini</Badge>;
    if (j.tanggal > today) return <Badge tone="blue">Akan datang</Badge>;
    return <Badge tone="red">Belum tercatat</Badge>;
  }

  function bukaForm(j?: Jadwal) {
    setForm(j
      ? { id: j.id, tanggal: j.tanggal, jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai, kelas: j.kelas, keterangan: j.keterangan }
      : { tanggal: day || (today.startsWith(ym) ? today : ym + '-01'), jam_mulai: '09:00', jam_selesai: '09:45', kelas: kelasF || daftarKelas[0]?.nama_kelas || '', keterangan: '' });
  }

  async function simpan() {
    if (!form) return;
    setSaving(true);
    try {
      await callApi('saveJadwal', form, session!.token);
      toast(form.id ? 'Jadwal diperbarui.' : 'Jadwal ditambahkan.');
      setForm(null);
      jad.reload();
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setSaving(false);
    }
  }

  async function hapus(j: Jadwal) {
    if (!window.confirm(`Hapus jadwal ${j.kelas} pada ${fmtTanggal(j.tanggal)}?`)) return;
    try {
      await callApi('deleteJadwal', { id: j.id }, session!.token);
      toast('Jadwal dihapus.');
      jad.reload();
    } catch (e: any) {
      toast(e.message, 'err');
    }
  }

  function catat(j: Jadwal) {
    router.push(`/kunjungan?new=1&tanggal=${j.tanggal}&kelas=${encodeURIComponent(j.kelas)}&jam=${j.jam_mulai}`);
  }

  const lead = firstWeekday(ym);
  const total = daysInMonth(ym);
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <>
      <PageHeader
        title="Jadwal kunjungan"
        subtitle="Jadwal kunjungan kelas ke perpustakaan, diatur per tanggal."
        actions={isAdmin && <button className="btn-primary" onClick={() => bukaForm()}><Plus size={16} /> Tambah jadwal</button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button className="btn-ghost btn-sm" aria-label="Bulan sebelumnya" onClick={() => { setYm(addMonths(ym, -1)); setDay(''); }}><ChevronLeft size={16} /></button>
          <span className="h-display min-w-40 text-center text-lg font-bold text-brand-900">{fmtBulan(ym)}</span>
          <button className="btn-ghost btn-sm" aria-label="Bulan berikutnya" onClick={() => { setYm(addMonths(ym, 1)); setDay(''); }}><ChevronRight size={16} /></button>
        </div>
        <select className="input !w-auto" value={kelasF} onChange={(e) => setKelasF(e.target.value)} aria-label="Filter kelas">
          <option value="">Semua kelas</option>
          {daftarKelas.map((k) => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
        </select>
        {day && <button className="btn-ghost btn-sm" onClick={() => setDay('')}>Tampilkan sebulan penuh</button>}
      </div>

      {(jad.error || kun.error) && <div className="mb-4"><ErrorBox message={jad.error || kun.error} onRetry={() => { jad.reload(); kun.reload(); }} /></div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="panel h-fit p-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((h) => <span key={h} className="py-1">{h}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((n, i) => {
              if (n === null) return <span key={i} />;
              const ds = `${ym}-${pad(n)}`;
              const c = counts[ds] || 0;
              const aktif = day === ds;
              return (
                <button key={i} onClick={() => setDay(aktif ? '' : ds)} aria-pressed={aktif}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-md text-sm font-semibold transition
                    ${aktif ? 'bg-brand-700 text-white' : ds === today ? 'bg-marigold-100 text-amber-900 ring-1 ring-marigold-400' : 'text-slate-700 hover:bg-brand-50'}`}>
                  {n}
                  {c > 0 && <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${aktif ? 'bg-marigold-400' : 'bg-brand-500'}`} />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">Titik menandai tanggal yang punya jadwal. Klik tanggal untuk menyaring daftar.</p>
        </section>

        <section className="space-y-4">
          {jad.loading && !jad.data ? <Spinner /> : grouped.length === 0 ? (
            <div className="panel"><Empty title="Tidak ada jadwal" hint={isAdmin ? 'Tambah jadwal dengan tombol di kanan atas.' : 'Admin belum membuat jadwal untuk periode ini.'} /></div>
          ) : grouped.map(([tgl, rows]) => (
            <div key={tgl} className="panel overflow-hidden">
              <div className="flex items-center justify-between bg-brand-50 px-4 py-2.5">
                <h3 className="font-bold text-brand-900">{fmtTanggal(tgl)}</h3>
                {tgl === today && <Badge tone="amber">Hari ini</Badge>}
              </div>
              <ul className="divide-y divide-slate-100">
                {rows.map((j) => (
                  <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{j.kelas} <span className="font-normal text-slate-500">· {j.jam_mulai}–{j.jam_selesai}</span></p>
                      {j.keterangan && <p className="text-sm text-slate-600">{j.keterangan}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {status(j)}
                      {bisaCatat(j) && <button className="btn-accent btn-sm" onClick={() => catat(j)}><NotebookPen size={14} /> Catat kunjungan</button>}
                      {isAdmin && (
                        <>
                          <button className="btn-ghost btn-sm" aria-label="Ubah jadwal" onClick={() => bukaForm(j)}><Pencil size={14} /></button>
                          <button className="btn-ghost btn-sm text-red-600" aria-label="Hapus jadwal" onClick={() => hapus(j)}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Ubah jadwal' : 'Tambah jadwal'}>
        {form && (
          <div className="space-y-4">
            <Field label="Kelas">
              <select className="input" value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })}>
                {daftarKelas.map((k) => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
              </select>
            </Field>
            <Field label="Tanggal"><input type="date" className="input" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jam mulai"><input type="time" className="input" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} /></Field>
              <Field label="Jam selesai"><input type="time" className="input" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} /></Field>
            </div>
            <Field label="Keterangan" hint="Opsional, misalnya Kunjungan rutin atau Pinjam buku tematik.">
              <input className="input" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} maxLength={120} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setForm(null)}>Batal</button>
              <button className="btn-primary" onClick={simpan} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan jadwal'}</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
