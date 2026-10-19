'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Shell from '@/components/Shell';
import { Spinner } from '@/components/ui';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !session) router.replace('/login');
  }, [ready, session, router]);
  if (!ready || !session) return <Spinner text="Memeriksa sesi…" />;
  return <Shell>{children}</Shell>;
}
