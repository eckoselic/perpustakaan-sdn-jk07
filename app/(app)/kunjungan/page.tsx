'use client';
import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { callApi } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { compressImage } from '@/lib/image';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, useToast } from '@/components/ui';
import { Kelas, Kunjungan } from '@/lib/types';
import { fmtBulan, fmtTanggal, nowTime, todayStr } from '@/lib/date';

const MAX_FOTO = 3;
const SARAN_KEGIATAN = ['Membaca bersama', 'Meminjam buku', 'Literasi mandiri', 'Mendongeng', 'Mengerjakan tugas'];

type Form = {
  id?: string; tanggal: string; jam: string; kelas: string; jumlah_siswa: string;
  kegiatan: string; catatan: string; fotoLama: string[]; fotoBaru: string[];
};

export default function KunjunganPage() {
  const { session } = useAuth();
  const user = session!.user;
  const toast = useToast();
  const bisaTulis = user.role === 'admin' || user.role === 'guru';

  const [ym, setYm] = useState(todayStr().slice(0, 7));
  const [kelasF, setKelasF] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [memproses, setMemproses] = useState(false);

  const params = useMemo(() => ({ from: ym + '-01', to: ym + '-31', kelas: kelasF || undefined }), [ym, kelasF]);
  const kun = useFetch<Kunjungan[]>('listKunjungan', params);
  const kel = useFetch<Kelas[]>('listKelas', {});
  const daftarKelas = kel.data || [];
  const rows = kun.data || [];
  const totalSiswa = rows.reduce((s, v) => s + v.jumlah_siswa, 0);

  const canEdit = (v: Kunjungan) => user.role === 'admin' || (user.role === 'guru' && v.kelas === user.kelas);

  function bukaForm(v?: Kunjungan, pre?: { tanggal?: string; kelas?: string; jam?: string }) {
    setForm(v
      ? { id: v.id, tanggal: v.tanggal, jam: v.jam, kelas: v.kelas, jumlah_siswa: String(v.jumlah_siswa), kegiatan: v.kegiatan, catatan: v.catatan, fotoLama: [...v.fotos], fotoBaru: [] }
      : {
          tanggal: pre?.tanggal || todayStr(), jam: pre?.jam || nowTime(),
          kelas: user.role === 'guru' ? user.kelas : pre?.kelas || '',
          jumlah_siswa: '', kegiatan: '', catatan: '', fotoLama: [], fotoBaru: [],
        });
  }

  // Buka form otomatis bila datang dari tombol "Catat kunjungan" (Beranda atau Jadwal)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('new') === '1' && bisaTulis) {
      if (p.get('tanggal')) setYm(p.get('tanggal')!.slice(0, 7));
      bukaForm(undefined, { tanggal: p.get('tanggal') || undefined, kelas: p.get('kelas') || undefined, jam: p.get('jam') || undefined });
    }
    if (p.toString()) window.history.replaceState(null, '', '/kunjungan');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tambahFoto(files: FileList | null) {
    if (!files || !form) return;
    const sisa = MAX_FOTO - form.fotoLama.length - form.fotoBaru.length;
    if (sisa <= 0) return toast(`Foto maksimal ${MAX_FOTO} per kunjungan.`, 'err');
    setMemproses(true);
    try {
      const hasil: string[] = [];
      for (const f of Array.from(files).slice(0, sisa)) hasil.push(await compressImage(f));
      setForm((cur) => (cur ? { ...cur, fotoBaru: [...cur.fotoBaru, ...hasil] } : cur));
      if (files.length > sisa) toast(`Hanya ${sisa} foto yang ditambahkan, batas maksimal ${MAX_FOTO}.`, 'err');
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setMemproses(false);
    }
  }

  async function simpan() {
    if (!form) return;
    if (!form.kelas) return toast('Pilih kelas terlebih dahulu.', 'err');
    if (form.jumlah_siswa === '' || Number(form.jumlah_siswa) < 0) return toast('Isi jumlah siswa yang berkunjung.', 'err');
    setSaving(true);
    try {
      await callApi('saveKunjungan', { ...form, jumlah_siswa: Number(form.jumlah_siswa) }, session!.token);
      toast(form.id ? 'Kunjungan diperbarui.' : 'Kunjungan dicatat.');
      setForm(null);
      kun.reload();
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setSaving(false);
    }
  }

  async function hapus(v: Kunjungan) {
    if (!window.confirm(`Hapus catatan kunjungan ${v.kelas} pada ${fmtTanggal(v.tanggal)}? Foto ikut terhapus.`)) return;
    try {
      await callApi('deleteKunjungan', { id: v.id }, session!.token);
      toast('Kunjungan dihapus.');
      kun.reload();
    } catch (e: any) {
      toast(e.message, 'err');
    }
  }

  return (
    <>
      <PageHeader
        title="Kunjungan perpustakaan"
        subtitle={user.role === 'kepsek' ? 'Riwayat kunjungan semua kelas (hanya dapat dilihat).' : 'Catat kunjungan per kelas, lengkap dengan foto kegiatan.'}
        actions={bisaTulis && <button className="btn-primary" onClick={() => bukaForm()}><Plus size={16} /> Catat kunjungan</button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input type="month" className="input !w-auto" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)} aria-label="Bulan" />
        <select className="input !w-auto" value={kelasF} onChange={(e) => setKelasF(e.target.value)} aria-label="Filter kelas">
          <option value="">Semua kelas</option>
          {daftarKelas.map((k) => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
        </select>
        <p className="text-sm text-slate-600">{fmtBulan(ym)}: <b className="text-brand-900">{rows.length}</b> kunjungan, <b className="text-brand-900">{totalSiswa}</b> siswa</p>
      </div>

      {kun.error && <div className="mb-4"><ErrorBox message={kun.error} onRetry={kun.reload} /></div>}

      {kun.loading && !kun.data ? <Spinner /> : rows.length === 0 ? (
        <div className="panel"><Empty title="Belum ada kunjungan pada periode ini" hint={bisaTulis ? 'Catat kunjungan dengan tombol di kanan atas.' : undefined} /></div>
      ) : (
        <ul className="space-y-3">
          {rows.map((v) => (
            <li key={v.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-brand-900">{v.kelas}</h3>
                    <Badge tone="blue">{v.jumlah_siswa} siswa</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{fmtTanggal(v.tanggal)}{v.jam ? ` · ${v.jam}` : ''}</p>
                </div>
                {canEdit(v) && (
                  <div className="flex gap-2">
                    <button className="btn-ghost btn-sm" aria-label="Ubah kunjungan" onClick={() => bukaForm(v)}><Pencil size={14} /> Ubah</button>
                    <button className="btn-ghost btn-sm text-red-600" aria-label="Hapus kunjungan" onClick={() => hapus(v)}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              {v.kegiatan && <p className="mt-2 text-sm font-semibold text-slate-800">{v.kegiatan}</p>}
              {v.catatan && <p className="mt-1 text-sm text-slate-600">{v.catatan}</p>}
              {v.fotos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {v.fotos.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Foto kunjungan ${v.kelas} ${i + 1}`} referrerPolicy="no-referrer" className="h-24 w-32 object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">Dicatat oleh {v.dicatat_oleh}</p>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!form} onClose={() => !saving && setForm(null)} title={form?.id ? 'Ubah kunjungan' : 'Catat kunjungan'} wide>
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kelas">
                <select className="input" value={form.kelas} disabled={user.role === 'guru'} onChange={(e) => setForm({ ...form, kelas: e.target.value })}>
                  <option value="">Pilih kelas</option>
                  {daftarKelas.map((k) => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
                </select>
              </Field>
              <Field label="Jumlah siswa">
                <input type="number" min={0} max={500} inputMode="numeric" className="input" value={form.jumlah_siswa} onChange={(e) => setForm({ ...form, jumlah_siswa: e.target.value })} />
              </Field>
              <Field label="Tanggal"><input type="date" className="input" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></Field>
              <Field label="Jam"><input type="time" className="input" value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} /></Field>
            </div>
            <Field label="Kegiatan">
              <input className="input" list="saran-kegiatan" value={form.kegiatan} onChange={(e) => setForm({ ...form, kegiatan: e.target.value })} maxLength={120} />
              <datalist id="saran-kegiatan">{SARAN_KEGIATAN.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Catatan"><textarea className="input min-h-20" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} maxLength={500} /></Field>

            <div>
              <span className="label">Foto kegiatan ({form.fotoLama.length + form.fotoBaru.length}/{MAX_FOTO})</span>
              <div className="flex flex-wrap gap-3">
                {form.fotoLama.map((src, i) => (
                  <div key={'l' + i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" referrerPolicy="no-referrer" className="h-24 w-32 rounded-md border border-slate-200 object-cover" />
                    <button aria-label="Hapus foto" className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white" onClick={() => setForm({ ...form, fotoLama: form.fotoLama.filter((_, x) => x !== i) })}><X size={12} /></button>
                  </div>
                ))}
                {form.fotoBaru.map((src, i) => (
                  <div key={'b' + i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-24 w-32 rounded-md border border-slate-200 object-cover" />
                    <button aria-label="Hapus foto" className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white" onClick={() => setForm({ ...form, fotoBaru: form.fotoBaru.filter((_, x) => x !== i) })}><X size={12} /></button>
                  </div>
                ))}
                {form.fotoLama.length + form.fotoBaru.length < MAX_FOTO && (
                  <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:border-brand-500 hover:text-brand-700">
                    <ImagePlus size={20} /> {memproses ? 'Memproses…' : 'Tambah foto'}
                    <input type="file" accept="image/*" multiple className="sr-only" disabled={memproses} onChange={(e) => { tambahFoto(e.target.files); e.target.value = ''; }} />
                  </label>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">Foto dikecilkan otomatis sebelum diunggah.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setForm(null)} disabled={saving}>Batal</button>
              <button className="btn-primary" onClick={simpan} disabled={saving || memproses}>{saving ? 'Menyimpan…' : 'Simpan kunjungan'}</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
