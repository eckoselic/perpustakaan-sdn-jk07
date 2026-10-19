'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { IS_PREVIEW, SCHOOL_NAME } from '@/lib/config';
import { resetPreview } from '@/lib/dummy';

const SPINES = [
  { h: 150, c: '#f5b82e' }, { h: 200, c: '#7fb5c4' }, { h: 120, c: '#b5483a' }, { h: 175, c: '#3f7d58' },
  { h: 215, c: '#d6e9ee' }, { h: 140, c: '#c9702b' }, { h: 190, c: '#6d5a9c' }, { h: 130, c: '#f5b82e' },
  { h: 165, c: '#4a93a8' }, { h: 110, c: '#b5483a' },
];

export default function LoginPage() {
  const { session, ready, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && session) router.replace('/dashboard');
  }, [ready, session, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      router.replace('/dashboard');
    } catch (ex: any) {
      setError(ex.message || 'Login gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-900 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="h-display text-5xl font-extrabold leading-[1.05]">Perpustakaan<br />{SCHOOL_NAME}</p>
          <p className="mt-5 max-w-sm text-brand-100">Catat kunjungan tiap kelas dan atur jadwal kunjungan ke perpustakaan dalam satu tempat.</p>
        </div>
        <div>
          <div className="flex items-end gap-2" aria-hidden>
            {SPINES.map((s, i) => (
              <span key={i} className="w-9 rounded-t-md" style={{ height: s.h, background: s.c }} />
            ))}
          </div>
          <div className="h-2 rounded-full bg-marigold-400" aria-hidden />
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <p className="h-display text-2xl font-bold text-brand-900 lg:hidden">Perpustakaan</p>
          <p className="mb-6 text-sm text-slate-500 lg:hidden">{SCHOOL_NAME}</p>
          <h1 className="h-display text-3xl font-bold text-brand-900">Masuk</h1>
          <p className="mb-6 mt-1 text-sm text-slate-600">Gunakan akun yang diberikan oleh admin perpustakaan.</p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="label">Username</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Masuk
            </button>
          </form>

          {IS_PREVIEW && (
            <div className="mt-6 rounded-lg border border-marigold-400/60 bg-marigold-100 p-4 text-sm text-amber-900">
              <p className="font-semibold">Mode Preview: pilih akun dummy</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[['admin', 'Admin'], ['guru', 'Guru Kelas 3'], ['kepsek', 'Kepala Sekolah']].map(([u, l]) => (
                  <button key={u} type="button" className="btn-ghost btn-sm" onClick={() => { setUsername(u); setPassword('edudigital'); }}>{l}</button>
                ))}
              </div>
              <p className="mt-2 text-xs">Password semua akun dummy: edudigital</p>
              <button type="button" className="mt-2 text-xs font-semibold underline" onClick={() => { resetPreview(); window.location.reload(); }}>
                Reset data dummy
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
