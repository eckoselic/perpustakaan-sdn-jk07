'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Spinner } from '@/components/ui';

export default function Home() {
  const { session, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(session ? '/dashboard' : '/login');
  }, [ready, session, router]);
  return <Spinner text="Membuka aplikasi…" />;
}
