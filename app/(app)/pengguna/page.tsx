'use client';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { callApi } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, useToast } from '@/components/ui';
import { Kelas, ROLE_LABEL, Role, User } from '@/lib/types';

type UserForm = { id?: string; username: string; nama: string; role: Role; kelas: string; password: string; aktif: string };
type KelasForm = { id?: string; nama_kelas: string; wali_kelas: string };

export default function PenggunaPage() {
  const { session } = useAuth();
  const toast = useToast();
  const isAdmin = session!.user.role === 'admin';
  const [tab, setTab] = useState<'users' | 'kelas'>('users');
  const [uf, setUf] = useState<UserForm | null>(null);
  const [kf, setKf] = useState<KelasForm | null>(null);
  const [saving, setSaving] = useState(false);

  const users = useFetch<User[]>('listUsers', {});
  const kelas = useFetch<Kelas[]>('listKelas', {});
  const daftarKelas = kelas.data || [];

  if (!isAdmin) {
    return <div className="panel"><Empty title="Halaman ini khusus admin" hint="Hubungi admin perpustakaan untuk mengubah akun atau data kelas." /></div>;
  }

  async function kirim(action: string, data: Record<string, any>, ok: string, done: () => void) {
    setSaving(true);
    try {
      await callApi(action, data, session!.token);
      toast(ok);
      done();
    } catch (e: any) {
      toast(e.message, 'err');
    } finally {
      setSaving(false);
    }
  }

  async function hapusUser(u: User) {
    if (!window.confirm(`Hapus akun ${u.username}?`)) return;
    try { await callApi('deleteUser', { id: u.id }, session!.token); toast('Akun dihapus.'); users.reload(); }
    catch (e: any) { toast(e.message, 'err'); }
  }
  async function hapusKelas(k: Kelas) {
    if (!window.confirm(`Hapus ${k.nama_kelas}?`)) return;
    try { await callApi('deleteKelas', { id: k.id }, session!.token); toast('Kelas dihapus.'); kelas.reload(); }
    catch (e: any) { toast(e.message, 'err'); }
  }

  return (
    <>
      <PageHeader
        title="Pengguna dan kelas"
        subtitle="Kelola akun yang dapat masuk dan daftar kelas yang berkunjung."
        actions={
          tab === 'users'
            ? <button className="btn-primary" onClick={() => setUf({ username: '', nama: '', role: 'guru', kelas: daftarKelas[0]?.nama_kelas || '', password: '', aktif: 'ya' })}><Plus size={16} /> Tambah akun</button>
            : <button className="btn-primary" onClick={() => setKf({ nama_kelas: '', wali_kelas: '' })}><Plus size={16} /> Tambah kelas</button>
        }
      />

      <div className="mb-4 inline-flex rounded-lg border border-slate-300 bg-white p-1" role="tablist">
        {([['users', 'Akun pengguna'], ['kelas', 'Daftar kelas']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold ${tab === k ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{l}</button>
        ))}
      </div>

      {(users.error || kelas.error) && <div className="mb-4"><ErrorBox message={users.error || kelas.error} onRetry={() => { users.reload(); kelas.reload(); }} /></div>}

      {tab === 'users' ? (
        <section className="panel overflow-x-auto">
          {users.loading && !users.data ? <Spinner /> : (users.data || []).length === 0 ? <Empty title="Belum ada akun" /> : (
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="bg-brand-50 text-left text-brand-900">
                <th className="px-5 py-2.5 font-semibold">Nama</th><th className="px-3 py-2.5 font-semibold">Username</th>
                <th className="px-3 py-2.5 font-semibold">Role</th><th className="px-3 py-2.5 font-semibold">Status</th><th className="px-5 py-2.5" />
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(users.data || []).map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-2.5 font-semibold text-slate-800">{u.nama}</td>
                    <td className="px-3 py-2.5 text-slate-600">{u.username}</td>
                    <td className="px-3 py-2.5">{ROLE_LABEL[u.role]}{u.kelas ? ` · ${u.kelas}` : ''}</td>
                    <td className="px-3 py-2.5">{u.aktif === 'ya' ? <Badge tone="green">Aktif</Badge> : <Badge tone="slate">Nonaktif</Badge>}</td>
                    <td className="px-5 py-2.5"><div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" aria-label={`Ubah ${u.username}`} onClick={() => setUf({ id: u.id, username: u.username, nama: u.nama, role: u.role, kelas: u.kelas, password: '', aktif: u.aktif })}><Pencil size={14} /></button>
                      <button className="btn-ghost btn-sm text-red-600" aria-label={`Hapus ${u.username}`} onClick={() => hapusUser(u)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <section className="panel overflow-x-auto">
          {kelas.loading && !kelas.data ? <Spinner /> : daftarKelas.length === 0 ? <Empty title="Belum ada kelas" hint="Tambah kelas dengan tombol di kanan atas." /> : (
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="bg-brand-50 text-left text-brand-900">
                <th className="px-5 py-2.5 font-semibold">Kelas</th><th className="px-3 py-2.5 font-semibold">Wali kelas</th><th className="px-5 py-2.5" />
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {daftarKelas.map((k) => (
                  <tr key={k.id}>
                    <td className="px-5 py-2.5 font-semibold text-slate-800">{k.nama_kelas}</td>
                    <td className="px-3 py-2.5 text-slate-600">{k.wali_kelas || '-'}</td>
                    <td className="px-5 py-2.5"><div className="flex justify-end gap-2">
                      <button className="btn-ghost btn-sm" aria-label={`Ubah ${k.nama_kelas}`} onClick={() => setKf({ id: k.id, nama_kelas: k.nama_kelas, wali_kelas: k.wali_kelas })}><Pencil size={14} /></button>
                      <button className="btn-ghost btn-sm text-red-600" aria-label={`Hapus ${k.nama_kelas}`} onClick={() => hapusKelas(k)}><Trash2 size={14} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <Modal open={!!uf} onClose={() => !saving && setUf(null)} title={uf?.id ? 'Ubah akun' : 'Tambah akun'}>
        {uf && (
          <div className="space-y-4">
            <Field label="Nama lengkap"><input className="input" value={uf.nama} onChange={(e) => setUf({ ...uf, nama: e.target.value })} /></Field>
            <Field label="Username" hint="Huruf kecil, angka, titik, strip, atau garis bawah (3–30 karakter).">
              <input className="input" value={uf.username} autoCapitalize="none" onChange={(e) => setUf({ ...uf, username: e.target.value })} />
            </Field>
            <Field label="Role">
              <select className="input" value={uf.role} onChange={(e) => setUf({ ...uf, role: e.target.value as Role })}>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </Field>
            {uf.role === 'guru' && (
              <Field label="Kelas yang diampu">
                <select className="input" value={uf.kelas} onChange={(e) => setUf({ ...uf, kelas: e.target.value })}>
                  <option value="">Pilih kelas</option>
                  {daftarKelas.map((k) => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
                </select>
              </Field>
            )}
            <Field label={uf.id ? 'Password baru' : 'Password'} hint={uf.id ? 'Kosongkan jika password tidak diganti. Minimal 6 karakter.' : 'Minimal 6 karakter.'}>
              <input className="input" type="text" autoComplete="off" value={uf.password} onChange={(e) => setUf({ ...uf, password: e.target.value })} />
            </Field>
            <Field label="Status akun">
              <select className="input" value={uf.aktif} onChange={(e) => setUf({ ...uf, aktif: e.target.value })}>
                <option value="ya">Aktif</option><option value="tidak">Nonaktif</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setUf(null)} disabled={saving}>Batal</button>
              <button className="btn-primary" disabled={saving} onClick={() => kirim('saveUser', uf, uf.id ? 'Akun diperbarui.' : 'Akun ditambahkan.', () => { setUf(null); users.reload(); })}>{saving ? 'Menyimpan…' : 'Simpan akun'}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!kf} onClose={() => !saving && setKf(null)} title={kf?.id ? 'Ubah kelas' : 'Tambah kelas'}>
        {kf && (
          <div className="space-y-4">
            <Field label="Nama kelas" hint={kf.id ? 'Nama kelas tidak dapat diubah agar riwayat tetap konsisten.' : 'Contoh: Kelas 4A'}>
              <input className="input" value={kf.nama_kelas} disabled={!!kf.id} onChange={(e) => setKf({ ...kf, nama_kelas: e.target.value })} />
            </Field>
            <Field label="Wali kelas"><input className="input" value={kf.wali_kelas} onChange={(e) => setKf({ ...kf, wali_kelas: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setKf(null)} disabled={saving}>Batal</button>
              <button className="btn-primary" disabled={saving} onClick={() => kirim('saveKelas', kf, kf.id ? 'Kelas diperbarui.' : 'Kelas ditambahkan.', () => { setKf(null); kelas.reload(); })}>{saving ? 'Menyimpan…' : 'Simpan kelas'}</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
