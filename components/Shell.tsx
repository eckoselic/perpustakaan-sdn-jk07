'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, BookOpen, CalendarDays, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { IS_PREVIEW, SCHOOL_NAME } from '@/lib/config';
import { ROLE_LABEL, Role } from '@/lib/types';

const NAV: { href: string; label: string; icon: typeof BookOpen; roles: Role[] }[] = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard, roles: ['admin', 'guru', 'kepsek'] },
  { href: '/jadwal', label: 'Jadwal', icon: CalendarDays, roles: ['admin', 'guru', 'kepsek'] },
  { href: '/kunjungan', label: 'Kunjungan', icon: BookOpen, roles: ['admin', 'guru', 'kepsek'] },
  { href: '/rekap', label: 'Rekap', icon: BarChart3, roles: ['admin', 'guru', 'kepsek'] },
  { href: '/pengguna', label: 'Pengguna', icon: Users, roles: ['admin'] },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const user = session!.user;
  const items = NAV.filter((n) => n.roles.includes(user.role));

  async function keluar() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 text-white md:flex print:hidden">
        <div className="px-6 pb-6 pt-7">
          <p className="h-display text-xl font-bold leading-tight">Perpustakaan</p>
          <p className="mt-0.5 text-sm text-brand-200">{SCHOOL_NAME}</p>
          <div className="mt-4 flex items-end gap-1" aria-hidden>
            {[18, 26, 14, 22, 30, 20, 12].map((h, i) => (
              <span key={i} className="w-2.5 rounded-t-sm" style={{ height: h, background: ['#f5b82e', '#7fb5c4', '#b5483a', '#3f7d58', '#d6e9ee', '#c9702b', '#6d5a9c'][i] }} />
            ))}
          </div>
          <div className="h-1 rounded-full bg-marigold-400" aria-hidden />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((n) => {
            const on = path === n.href || path.startsWith(n.href + '/');
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${on ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-brand-800'}`}>
                <n.icon size={18} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-brand-800 p-4">
          <p className="truncate text-sm font-semibold">{user.nama}</p>
          <p className="text-xs text-brand-200">{ROLE_LABEL[user.role]}{user.kelas ? ` · ${user.kelas}` : ''}</p>
          <button onClick={keluar} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-600 px-3 py-2 text-sm font-semibold text-brand-100 hover:bg-brand-800">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-900 px-4 py-3 text-white md:hidden print:hidden">
        <div>
          <p className="h-display text-base font-bold leading-none">Perpustakaan</p>
          <p className="text-xs text-brand-200">{user.nama}</p>
        </div>
        <button onClick={keluar} aria-label="Keluar" className="rounded-lg p-2 text-brand-100 hover:bg-brand-800"><LogOut size={20} /></button>
      </header>

      <main className="pb-24 md:pb-10 md:pl-64 print:pl-0 print:pb-0">
        {IS_PREVIEW && (
          <div className="bg-marigold-100 px-4 py-2 text-center text-xs font-semibold text-amber-900 print:hidden">
            Mode Preview: memakai data dummy yang tersimpan di browser ini, belum terhubung ke Google Sheets.
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 print:p-0">{children}</div>
      </main>

      {/* Navigasi bawah mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden print:hidden">
        {items.map((n) => {
          const on = path === n.href || path.startsWith(n.href + '/');
          return (
            <Link key={n.href} href={n.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${on ? 'text-brand-700' : 'text-slate-500'}`}>
              <n.icon size={20} /> {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
