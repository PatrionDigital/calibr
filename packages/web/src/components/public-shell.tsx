'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { PublicRouteGuard } from '@/components/auth-guard';

/**
 * PublicShell - Client component wrapper for public routes
 *
 * Handles redirect logic for connected users on landing page.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Only redirect from landing page, not from /verify
  const isLandingPage = pathname === '/';

  return (
    <PublicRouteGuard
      redirectWhenConnected={isLandingPage}
      redirectTo="/markets"
    >
      <Header />
      {children}
    </PublicRouteGuard>
  );
}
